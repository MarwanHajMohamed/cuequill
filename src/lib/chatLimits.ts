// Per-user fair-use limits for Quill AI. These protect the shared Gemini
// key from a single user monopolising rate limits or running up cost:
//   - a daily message cap (the primary abuse guard), and
//   - a monthly token budget (a backstop for pathological usage — each
//     request ships the user's full trade context, so tokens matter more
//     than raw message count).
// Both are env-overridable so they can be tuned without a code change.
export const DAILY_MESSAGE_LIMIT = Number(
  process.env.CHAT_DAILY_MESSAGE_LIMIT ?? 40,
);
export const MONTHLY_TOKEN_LIMIT = Number(
  process.env.CHAT_MONTHLY_TOKEN_LIMIT ?? 10_000_000,
);

// UTC day/month bucket keys. Counters reset when the current key differs
// from the one stored on the user, so there's no separate cron to run.
export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // yyyy-MM-dd
}
export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7); // yyyy-MM
}
