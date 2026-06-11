import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

// The iOS app is a native shell around the deployed web app: the webview
// loads the production URL (server.url) with the Capacitor bridge
// injected, so the SAME deployed frontend can call native plugins
// (status bar, haptics, splash, keyboard) when it detects it's running
// inside the shell. One codebase, no static export needed — auth cookies
// and API routes keep working exactly as they do in Safari.
//
// Set the production URL before syncing:
//   CAP_SERVER_URL=https://your-app.vercel.app npx cap sync ios
// If unset, the shell loads the local fallback page in native-shell/
// which explains how to configure it.

const serverUrl = process.env.CAP_SERVER_URL;

if (!serverUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "[capacitor] CAP_SERVER_URL is not set — the iOS shell will load the " +
      "local fallback page. Set it to your deployed URL and re-run " +
      "`npx cap sync ios`.",
  );
}

const config: CapacitorConfig = {
  appId: "com.cuequill.app",
  appName: "Cuequill",
  // Only used when server.url is unset (fallback page) — Capacitor
  // requires a webDir either way.
  webDir: "native-shell",
  backgroundColor: "#0E0E10",
  ...(serverUrl ? { server: { url: serverUrl } } : {}),
  ios: {
    // Let the web content draw edge-to-edge; the app already handles
    // env(safe-area-inset-*) from its PWA support.
    contentInset: "never",
    backgroundColor: "#0E0E10",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: false,
      backgroundColor: "#0E0E10",
      showSpinner: false,
    },
    Keyboard: {
      // Resize the webview like Safari resizes its viewport - the app's
      // dvh-based layouts (chat, calendar) are built for that behaviour.
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
