# Native push notifications (iOS / APNs)

Cuequill sends **native push notifications** to the iOS app via Apple Push
Notification service (APNs) using token-based (`.p8`) auth — no third-party
push service. Two reminder types are wired up today:

- **Economic events** — an evening-before heads-up for FOMC / CPI / PPI / PCE
  (`/api/cron/push-econ-reminders`, deep-links to `/calendar`).
- **Journaling** — a weekday evening nudge to log the day's trades
  (`/api/cron/push-journal-reminders`, deep-links to `/trades`).

Both are **opt-in**, per user, under **Settings → Notifications** (the Push
section only appears inside the iOS app).

## How it fits together

| Piece | Path |
| --- | --- |
| APNs sender (HTTP/2, ES256 JWT) | `src/lib/push/apns.ts` |
| Send to all of a user's devices | `src/lib/push/send.ts` |
| Device model (one row per token) | `src/lib/models/PushDevice.ts` |
| Register / unregister a token | `src/app/api/push/register/route.ts` |
| Client registration helpers | `src/lib/push/client.ts` |
| Launch-time registration + deep-link | `src/app/PushRegister.tsx` |
| Settings toggles | `src/app/settings/NotificationsTab.tsx` |
| Econ reminder cron | `src/app/api/cron/push-econ-reminders/route.ts` |
| Journal reminder cron | `src/app/api/cron/push-journal-reminders/route.ts` |

Flow: on launch (and when the user enables push in Settings) the app requests
permission, registers with APNs, and POSTs its device token to
`/api/push/register`. The hourly crons look up each opted-in user's devices and
send through `src/lib/push/apns.ts`. Tokens Apple reports as dead are pruned
automatically.

## One-time Apple setup

1. **Create an APNs Auth Key** — [developer.apple.com](https://developer.apple.com)
   → Certificates, Identifiers & Profiles → **Keys** → **+** → tick **Apple Push
   Notifications service (APNs)** → download the `AuthKey_XXXXXXXXXX.p8`
   (**you can only download it once**). Note the **Key ID** (10 chars) and your
   **Team ID** (top-right of the portal).
2. **Enable the capability on the App ID** — Identifiers → `com.cuequill.app` →
   tick **Push Notifications** → Save.
3. **Xcode** — open `ios/App/App.xcworkspace`, select the **App** target →
   **Signing & Capabilities** → **+ Capability** → **Push Notifications**. The
   entitlements file (`ios/App/App/App.entitlements`) is already in the repo and
   wired via `CODE_SIGN_ENTITLEMENTS`, so this should just light up.
4. `npx cap sync ios` to pull in the `@capacitor/push-notifications` native pod,
   then build to a **real device** (the Simulator can't obtain an APNs token).

> The entitlement ships as `aps-environment = development`. Xcode promotes it to
> `production` automatically when you archive for TestFlight / the App Store, so
> the same file covers both. A debug build registers a **sandbox** token; a
> TestFlight / App Store build registers a **production** token. Each only works
> against its matching APNs host — see `APNS_PRODUCTION` below.

## Server environment variables

Set these in Vercel (Production + Preview):

| Var | Required | Notes |
| --- | --- | --- |
| `APNS_KEY_ID` | yes | 10-char Key ID of the `.p8` |
| `APNS_TEAM_ID` | yes | Apple Developer Team ID |
| `APNS_AUTH_KEY` | yes | Full contents of the `.p8` (PEM). Newlines may be pasted real or escaped as `\n` |
| `APNS_BUNDLE_ID` | no | Defaults to `com.cuequill.app` |
| `APNS_PRODUCTION` | no | `true` → `api.push.apple.com` (TestFlight / App Store builds). Unset/false → sandbox host (debug builds from Xcode) |
| `PUSH_ECON_HOUR` | no | Local hour (0–23) for the econ heads-up. Default `18` |
| `PUSH_JOURNAL_HOUR` | no | Local hour for the journal nudge. Default `21` |
| `NEXT_PUBLIC_APP_URL` | no | Base URL the econ cron reads `/api/econ-dates` from. Default `https://www.cuequill.com` |

If `APNS_*` are unset the send path no-ops cleanly (nothing is sent, nothing
errors) — so the app and crons keep working before Apple setup is done.

> **`APNS_PRODUCTION` vs build type:** most real users are on TestFlight / the App
> Store, so you'll run with `APNS_PRODUCTION=true`. Tokens are stored with the
> environment they registered under; the sender routes each to the right host.
> A token registered by a debug build won't receive production sends and vice
> versa — re-register after switching build types.

## Scheduling (QStash)

Like the other crons, the hourly schedule is owned by **Upstash QStash**, not
GitHub Actions. Add two schedules, each firing **hourly**, with header
`Authorization: Bearer <CRON_SECRET>`:

- `https://www.cuequill.com/api/cron/push-econ-reminders`
- `https://www.cuequill.com/api/cron/push-journal-reminders`

One hourly fire covers every timezone — each endpoint only acts on users whose
local time is currently in the send hour.

## Testing

- **Smoke test a send** (bypasses the time window and dedupe): trigger the
  manual GitHub workflow, or curl directly:

  ```bash
  curl -L -H "Authorization: Bearer $CRON_SECRET" \
    "https://www.cuequill.com/api/cron/push-econ-reminders?email=you@example.com"
  curl -L -H "Authorization: Bearer $CRON_SECRET" \
    "https://www.cuequill.com/api/cron/push-journal-reminders?email=you@example.com"
  ```

  You must have the iOS app installed, be signed in as that user, and have
  enabled notifications in Settings first (so a device token exists).

- The JSON response reports `devices`, `sent`, and `pruned` so you can see
  whether a token was found and whether APNs accepted it.
