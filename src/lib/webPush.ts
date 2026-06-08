import webpush, { PushSubscription, WebPushError } from "web-push";

// Configure VAPID once at module load. Generate keys with:
//   npx web-push generate-vapid-keys
// Then set in env:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   VAPID_SUBJECT=mailto:hello@cuequill.com
//
// Missing keys at runtime → send() throws; callers should swallow so a
// failed push doesn't take down the cron route.
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@cuequill.com";

let vapidConfigured = false;
function configureVapid() {
  if (vapidConfigured) return;
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env.",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Push to a single subscription. Returns true on success.
 * On 404 / 410 (expired subscription), returns false so the caller
 * can prune it from the user's record.
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: NotificationPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  configureVapid();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, gone: false };
  } catch (err) {
    if (err instanceof WebPushError) {
      // 404 = endpoint not found, 410 = unsubscribed by user/browser
      if (err.statusCode === 404 || err.statusCode === 410) {
        return { ok: false, gone: true };
      }
    }
    console.warn("[push] send failed:", err);
    return { ok: false, gone: false };
  }
}
