// Public launch. Until this moment the app is in pre-launch: new accounts
// can be created (and are added to the waitlist) but are locked - they can
// neither auto-login on signup nor sign in - until launch. Sign-in gating
// keys off a per-user `preLaunchLockUntil` timestamp set to this value, so
// locked accounts unlock themselves automatically once the date passes; no
// migration or cron needed. Accounts without the field (owner, comps,
// testers) are never blocked.
//
// 25 September 2026, 00:00 UK (BST, UTC+1).
export const LAUNCH_AT = new Date("2026-09-25T00:00:00+01:00");

export function isPreLaunch(now: Date = new Date()): boolean {
  return now.getTime() < LAUNCH_AT.getTime();
}
