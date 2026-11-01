// Public launch: 25 September 2026, 00:00 UK (BST, UTC+1). Now purely a
// historical anchor - the `launch-announce` cron uses it to scope the
// launch email to waitlist entries that pre-dated launch, and skips
// itself if this ever moves back into the future.
export const LAUNCH_AT = new Date("2026-09-25T00:00:00+01:00");

export function isPreLaunch(now: Date = new Date()): boolean {
  return now.getTime() < LAUNCH_AT.getTime();
}
