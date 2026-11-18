"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Runs only inside the Capacitor iOS shell. Binds the push listeners (so a
// tapped notification can deep-link) and, if the user has already granted
// permission, re-registers on launch so a refreshed APNs token lands in the
// database. It never prompts here - the permission prompt is driven from
// Settings → Notifications so it appears in context.
export default function PushRegister() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { isNativePush, bindPushListeners, getPushPermission, registerDevice } =
          await import("@/lib/push/client");
        if (!(await isNativePush()) || cancelled) return;

        await bindPushListeners((data) => {
          const url = typeof data?.url === "string" ? data.url : null;
          if (url) router.push(url);
        });

        if ((await getPushPermission()) === "granted") {
          await registerDevice();
        }
      } catch {
        /* not running in the native shell */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
