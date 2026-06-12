"use client";

import { useEffect } from "react";

// Runs only inside the Capacitor iOS shell (no-op in Safari / PWA / SSR).
// The shell loads the deployed site with the Capacitor bridge injected,
// so this is where the web app adopts native behaviours: status bar
// styling, splash-screen dismissal, and keyboard accessory cleanup.
// Everything is dynamically imported and failure-tolerant so the web
// bundle only pulls the plugin code when actually running natively.
export default function NativeBridge() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || cancelled) return;

        // Lets CSS target the native shell if ever needed
        // (e.g. html.capacitor-native { … }).
        document.documentElement.classList.add("capacitor-native");

        const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }] =
          await Promise.all([
            import("@capacitor/status-bar"),
            import("@capacitor/splash-screen"),
            import("@capacitor/keyboard"),
          ]);

        // Dark app → light status-bar text, drawn over the webview so
        // the existing env(safe-area-inset-top) handling keeps working
        // exactly like it does in standalone PWA mode.
        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

        // Hide the iOS "<  >  Done" accessory bar above the keyboard -
        // the chat composer and inline inputs don't need it.
        await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(
          () => {},
        );

        // The app is interactive by now - drop the splash.
        await SplashScreen.hide().catch(() => {});
      } catch {
        /* not running in the native shell */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
