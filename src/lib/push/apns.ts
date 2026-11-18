// lib/push/apns.ts
//
// Minimal Apple Push Notification service (APNs) sender using token-based
// (JWT / .p8 key) auth over HTTP/2 - no third-party dependency. Built for the
// serverless cron routes: open a connection, fan out to a user's device
// tokens, report which tokens Apple rejected so the caller can prune them.
//
// Required env (all server-side):
//   APNS_KEY_ID     - the 10-char Key ID of the APNs auth key (.p8)
//   APNS_TEAM_ID    - your 10-char Apple Developer Team ID
//   APNS_AUTH_KEY   - the contents of the AuthKey_XXXX.p8 file (PEM). Newlines
//                     may be real or escaped as "\n" (Vercel-style single line).
//   APNS_BUNDLE_ID  - the app bundle id / APNs topic (default com.cuequill.app)
//   APNS_PRODUCTION - "true" to hit api.push.apple.com, else the sandbox host.
//
// APNs reference: https://developer.apple.com/documentation/usernotifications/
//   setting_up_a_remote_notification_server/sending_notification_requests_to_apns

import http2 from "node:http2";
import { createPrivateKey, sign as cryptoSign } from "node:crypto";

const PROD_HOST = "https://api.push.apple.com";
const SANDBOX_HOST = "https://api.sandbox.push.apple.com";

export type ApnsPayload = {
  title: string;
  body: string;
  // Extra data delivered in the aps-adjacent object; the app reads this on tap
  // (e.g. { url: "/calendar" } to deep-link).
  data?: Record<string, unknown>;
  badge?: number;
  sound?: string;
  // Groups related alerts in Notification Center and lets a newer alert
  // replace an older one with the same id.
  threadId?: string;
  collapseId?: string;
};

export type ApnsSendResult = {
  sent: number;
  failed: number;
  // Tokens Apple says are permanently invalid (uninstalled / wrong env) and
  // should be removed from the database so we stop trying them.
  invalidTokens: string[];
  errors: { token: string; status: number; reason: string }[];
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Normalise a .p8 that may arrive as a single line with literal "\n".
function normalizeKey(raw: string): string {
  const k = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  return k.trim() + "\n";
}

// Cache the provider JWT in module scope. APNs accepts a token for up to an
// hour and rejects one refreshed more than once every 20 minutes, so we reuse
// it and refresh at ~50 minutes.
let cachedJwt: { token: string; iat: number } | null = null;
const JWT_TTL_SECONDS = 50 * 60;

export function getProviderToken(
  keyId: string,
  teamId: string,
  authKey: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.iat < JWT_TTL_SECONDS) {
    return cachedJwt.token;
  }

  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${claims}`;

  const key = createPrivateKey(normalizeKey(authKey));
  // dsaEncoding "ieee-p1363" yields the raw r||s signature JOSE/ES256 expects
  // (Apple rejects the default DER encoding).
  const signature = cryptoSign("sha256", Buffer.from(signingInput), {
    key,
    dsaEncoding: "ieee-p1363",
  });

  const token = `${signingInput}.${base64url(signature)}`;
  cachedJwt = { token, iat: now };
  return token;
}

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  authKey: string;
  bundleId: string;
  production: boolean;
};

// Reads APNs config from the environment, or returns null when it isn't
// configured so callers can degrade gracefully instead of throwing.
export function getApnsConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const authKey = process.env.APNS_AUTH_KEY;
  if (!keyId || !teamId || !authKey) return null;
  return {
    keyId,
    teamId,
    authKey,
    bundleId: process.env.APNS_BUNDLE_ID || "com.cuequill.app",
    production: process.env.APNS_PRODUCTION === "true",
  };
}

function buildBody(payload: ApnsPayload): string {
  return JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: payload.sound ?? "default",
      ...(payload.badge !== undefined ? { badge: payload.badge } : {}),
      ...(payload.threadId ? { "thread-id": payload.threadId } : {}),
    },
    ...(payload.data ?? {}),
  });
}

// Send one notification to many device tokens over a single HTTP/2 session.
// Resolves once every request has settled. Never throws for per-token
// failures - those are reported in the result.
export async function sendApnsNotifications(
  deviceTokens: string[],
  payload: ApnsPayload,
  config: ApnsConfig,
): Promise<ApnsSendResult> {
  const result: ApnsSendResult = {
    sent: 0,
    failed: 0,
    invalidTokens: [],
    errors: [],
  };
  const tokens = [...new Set(deviceTokens.filter(Boolean))];
  if (tokens.length === 0) return result;

  const host = config.production ? PROD_HOST : SANDBOX_HOST;
  const jwt = getProviderToken(config.keyId, config.teamId, config.authKey);
  const body = buildBody(payload);

  const client = http2.connect(host);
  // Surface connection-level errors as a rejected session rather than an
  // unhandled 'error' event taking down the process.
  const sessionError = new Promise<never>((_, reject) => {
    client.once("error", reject);
  });

  try {
    await Promise.all(
      tokens.map(
        (token) =>
          Promise.race([
            sessionError,
            new Promise<void>((resolve) => {
              const headers: http2.OutgoingHttpHeaders = {
                ":method": "POST",
                ":path": `/3/device/${token}`,
                authorization: `bearer ${jwt}`,
                "apns-topic": config.bundleId,
                "apns-push-type": "alert",
                "apns-priority": "10",
                ...(payload.collapseId
                  ? { "apns-collapse-id": payload.collapseId }
                  : {}),
              };
              const req = client.request(headers);
              let status = 0;
              let data = "";
              req.setEncoding("utf8");
              req.on("response", (h) => {
                status = Number(h[":status"]) || 0;
              });
              req.on("data", (chunk) => {
                data += chunk;
              });
              req.on("error", () => {
                result.failed++;
                result.errors.push({ token, status: 0, reason: "stream error" });
                resolve();
              });
              req.on("end", () => {
                if (status === 200) {
                  result.sent++;
                } else {
                  result.failed++;
                  let reason = data;
                  try {
                    reason = JSON.parse(data)?.reason ?? data;
                  } catch {
                    /* keep raw body */
                  }
                  result.errors.push({ token, status, reason });
                  // 410 Unregistered, or 400 BadDeviceToken / DeviceTokenNotForTopic
                  // mean the token will never work again - prune it.
                  if (
                    status === 410 ||
                    reason === "BadDeviceToken" ||
                    reason === "Unregistered" ||
                    reason === "DeviceTokenNotForTopic"
                  ) {
                    result.invalidTokens.push(token);
                  }
                }
                resolve();
              });
              req.end(body);
            }),
          ]) as Promise<void>,
      ),
    );
  } finally {
    client.close();
  }

  return result;
}
