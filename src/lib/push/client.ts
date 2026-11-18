// lib/push/client.ts
//
// Client-side helpers for native push registration inside the Capacitor iOS
// shell. Everything dynamically imports the Capacitor plugins so the web
// bundle only loads them when actually running natively, and every call
// no-ops cleanly in Safari / the PWA.

export type PushPermission =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

const BUNDLE_ID = "com.cuequill.app";

export async function isNativePush(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Remember the most recently issued APNs token so we can unregister it from
// the backend when the user turns push off.
let lastToken: string | null = null;
let listenersBound = false;

async function postToken(token: string): Promise<void> {
  try {
    await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: "ios", bundleId: BUNDLE_ID }),
    });
  } catch {
    /* offline / not logged in - a later launch re-registers */
  }
}

// Wire up the plugin listeners exactly once. `onTap` receives the custom
// `data` payload of a notification the user tapped (e.g. { url }).
export async function bindPushListeners(
  onTap?: (data: Record<string, unknown>) => void,
): Promise<void> {
  if (!(await isNativePush()) || listenersBound) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  await PushNotifications.addListener("registration", (t) => {
    lastToken = t.value;
    void postToken(t.value);
  });
  await PushNotifications.addListener("registrationError", (err) => {
    console.warn("[push] registration error", err);
  });
  if (onTap) {
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => onTap(action.notification.data ?? {}),
    );
  }
  listenersBound = true;
}

// Current OS-level permission, without prompting.
export async function getPushPermission(): Promise<PushPermission> {
  if (!(await isNativePush())) return "unsupported";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const p = await PushNotifications.checkPermissions();
    return p.receive === "granted"
      ? "granted"
      : p.receive === "denied"
        ? "denied"
        : "prompt";
  } catch {
    return "unsupported";
  }
}

// Register the device with APNs (fires the `registration` listener, which
// posts the token to the backend). Safe to call repeatedly - a refreshed
// token simply upserts.
export async function registerDevice(): Promise<void> {
  if (!(await isNativePush())) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.register();
}

// Ask for permission (if not already decided) and register. Returns the
// resulting permission so the UI can explain a denial.
export async function enablePush(): Promise<PushPermission> {
  if (!(await isNativePush())) return "unsupported";
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await bindPushListeners();

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted" && perm.receive !== "denied") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") {
    return perm.receive === "denied" ? "denied" : "prompt";
  }
  await PushNotifications.register();
  return "granted";
}

// Best-effort removal of this device's token from the backend.
export async function unregisterDevice(): Promise<void> {
  if (!lastToken) return;
  try {
    await fetch("/api/push/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: lastToken }),
    });
  } catch {
    /* non-fatal */
  }
}
