// Pure helpers for the affirmations streak. A "day" is a yyyy-MM-dd string
// in the user's local timezone (same basis as the read-state), so all date
// math is done on the string via UTC to avoid tz drift.

export type AffirmationStreak = {
  current: number;
  longest: number;
  lastDate: string; // yyyy-MM-dd of the most recent completed day
};

export const EMPTY_STREAK: AffirmationStreak = {
  current: 0,
  longest: 0,
  lastDate: "",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The calendar day before `date` (yyyy-MM-dd → yyyy-MM-dd).
export function prevDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Record a completed day and return the updated streak. Idempotent for the
// same day. Extends the run when the previous completed day was yesterday,
// otherwise starts a fresh run at 1.
export function advanceStreak(
  streak: AffirmationStreak,
  date: string,
): AffirmationStreak {
  if (!DATE_RE.test(date)) return streak;
  if (streak.lastDate === date) return streak; // already counted today

  const current = streak.lastDate === prevDay(date) ? streak.current + 1 : 1;
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastDate: date,
  };
}

// The live current-streak value for display: a stored run only counts if it
// was completed today or yesterday; older than that means the streak lapsed.
export function effectiveCurrent(
  streak: AffirmationStreak,
  today: string,
): number {
  if (!DATE_RE.test(today)) return streak.current;
  if (streak.lastDate === today || streak.lastDate === prevDay(today)) {
    return streak.current;
  }
  return 0;
}
