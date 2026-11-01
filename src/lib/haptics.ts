// Native haptic feedback via Capacitor. Every function is a no-op on the
// web / SSR and fails silently, so callers can fire haptics unconditionally
// without guarding for platform. The plugin is dynamically imported so the
// web bundle never pulls it unless actually running inside the native shell.

// Cache the native-availability check: null = unknown, false = web (skip),
// true = native shell. Avoids re-importing @capacitor/core on every tap.
let isNative: boolean | null = null;

async function haptics() {
  if (isNative === false) return null;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      isNative = false;
      return null;
    }
    isNative = true;
    return await import("@capacitor/haptics");
  } catch {
    isNative = false;
    return null;
  }
}

// A short impact - use for taps on primary controls (nav, toggles, sends).
export async function hapticTap(
  strength: "light" | "medium" | "heavy" = "light",
): Promise<void> {
  const h = await haptics();
  if (!h) return;
  try {
    const style =
      strength === "heavy"
        ? h.ImpactStyle.Heavy
        : strength === "medium"
          ? h.ImpactStyle.Medium
          : h.ImpactStyle.Light;
    await h.Haptics.impact({ style });
  } catch {
    /* ignore */
  }
}

// A notification buzz - use for outcomes (saved, merged, error).
export async function hapticNotify(
  type: "success" | "warning" | "error" = "success",
): Promise<void> {
  const h = await haptics();
  if (!h) return;
  try {
    const t =
      type === "error"
        ? h.NotificationType.Error
        : type === "warning"
          ? h.NotificationType.Warning
          : h.NotificationType.Success;
    await h.Haptics.notification({ type: t });
  } catch {
    /* ignore */
  }
}
