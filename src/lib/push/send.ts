// lib/push/send.ts
//
// Server-side: send a push payload to every device a user has registered,
// routing each token to the APNs environment it was registered under and
// pruning any tokens Apple reports as permanently invalid.

import { PushDevice } from "@/lib/models/PushDevice";
import {
  getApnsConfig,
  sendApnsNotifications,
  type ApnsPayload,
} from "@/lib/push/apns";

export type SendToUserResult = {
  devices: number;
  sent: number;
  pruned: number;
  // null when APNs isn't configured (so callers can log once and move on).
  configured: boolean;
};

export async function sendPushToUser(
  userId: string,
  payload: ApnsPayload,
): Promise<SendToUserResult> {
  const baseConfig = getApnsConfig();
  if (!baseConfig) return { devices: 0, sent: 0, pruned: 0, configured: false };

  const devices = await PushDevice.find({ userId })
    .select("token environment bundleId")
    .lean<
      Array<{ token: string; environment: "sandbox" | "production"; bundleId: string }>
    >();
  if (devices.length === 0) {
    return { devices: 0, sent: 0, pruned: 0, configured: true };
  }

  // Group tokens by (environment, bundleId) so each send hits the right host
  // and topic.
  const groups = new Map<string, { env: "sandbox" | "production"; bundleId: string; tokens: string[] }>();
  for (const d of devices) {
    const key = `${d.environment}|${d.bundleId}`;
    const g = groups.get(key) ?? {
      env: d.environment,
      bundleId: d.bundleId || baseConfig.bundleId,
      tokens: [],
    };
    g.tokens.push(d.token);
    groups.set(key, g);
  }

  let sent = 0;
  const invalid: string[] = [];
  for (const g of groups.values()) {
    const res = await sendApnsNotifications(g.tokens, payload, {
      ...baseConfig,
      bundleId: g.bundleId,
      production: g.env === "production",
    });
    sent += res.sent;
    invalid.push(...res.invalidTokens);
  }

  let pruned = 0;
  if (invalid.length > 0) {
    const r = await PushDevice.deleteMany({ token: { $in: invalid } });
    pruned = r.deletedCount ?? 0;
  }

  return { devices: devices.length, sent, pruned, configured: true };
}
