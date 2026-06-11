# Cuequill iOS app (Capacitor)

The iOS app is a **Capacitor shell**: a native Swift app whose webview
loads the **deployed web app** with the Capacitor bridge injected. There
is no second frontend codebase — the same Vercel deployment serves
Safari, the PWA, and the iOS app. When the web app detects it's running
inside the shell (`src/app/NativeBridge.tsx`), it adopts native
behaviour: status-bar styling, splash-screen dismissal, and keyboard
accessory-bar removal. Auth cookies and all API routes work exactly as
they do in Safari.

## What's in the repo

| Path | Purpose |
| --- | --- |
| `capacitor.config.ts` | App id/name, server URL, plugin config |
| `ios/` | Generated Xcode project (Swift Package Manager, no CocoaPods) |
| `native-shell/` | Fallback page shown only if the shell isn't pointed at a server |
| `resources/` | Source art for app icon + splash (1024² / 2732²) |
| `src/app/NativeBridge.tsx` | Web-side native integration (no-op outside the shell) |

Installed plugins: `app`, `haptics`, `keyboard`, `splash-screen`,
`status-bar`.

## Prerequisites (one-time)

- A Mac with **Xcode 16+** (App Store → Xcode).
- An **Apple Developer account** — free for running on your own phone,
  $99/yr for TestFlight / App Store.
- Node 20+.

## Build & run on your iPhone

```bash
git clone <repo> && cd cuequill
npm install

# Point the shell at the deployed app and sync the native project:
CAP_SERVER_URL=https://<your-production-url> npx cap sync ios

# Generate all icon/splash sizes from resources/ (one-time, and after
# any artwork change):
npx @capacitor/assets generate --ios

# Open in Xcode:
npx cap open ios
```

In Xcode: select the **App** target → *Signing & Capabilities* → choose
your team → plug in your iPhone → Run. That's it; the app installs like
any native app.

## Releasing to TestFlight / App Store

1. Product → Archive in Xcode, then *Distribute App*.
2. App Store Connect: create the app record (bundle id
   `com.cuequill.app`), upload screenshots, submit for review.
3. **Guideline 4.2 note:** Apple can reject apps that are "just a
   website". Mitigations already in place: native splash, status-bar
   integration, keyboard handling. Strengthening it further with push
   notifications (`@capacitor/push-notifications` + APNs) and haptics
   before submission is recommended.

## How updates ship

Because the shell loads the deployed URL, **every Vercel deploy updates
the iOS app instantly** — no App Store re-submission needed for web
changes. Only native changes (new plugins, icon, config) require a new
build/archive.

## Troubleshooting

- **App shows "shell isn't pointed at a server"** — you synced without
  `CAP_SERVER_URL`. Re-run the sync command above and rebuild.
- **Login loops** — make sure `NEXTAUTH_URL` on Vercel matches the URL
  you set in `CAP_SERVER_URL`.
- **White flash on launch** — the splash hides when the page is
  interactive; slow networks lengthen it. Consider a custom timeout in
  `NativeBridge.tsx`.
