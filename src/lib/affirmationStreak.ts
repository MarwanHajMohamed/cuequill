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

// Progressive XP milestones for streak length - the longer the streak, the
// bigger the payout. Awarded once each, keyed off the best-ever streak (see
// streakXpBetween), so they can't be farmed by breaking and rebuilding.
export const STREAK_XP: { days: number; xp: number }[] = [
  { days: 3, xp: 50 },
  { days: 7, xp: 100 },
  { days: 14, xp: 200 },
  { days: 30, xp: 350 },
  { days: 60, xp: 500 },
  { days: 100, xp: 800 },
  { days: 180, xp: 1200 },
  { days: 365, xp: 2000 },
];

// Sum the XP for milestones newly crossed when the best streak grows from
// `from` days to `to` days (exclusive of `from`, inclusive of `to`).
export function streakXpBetween(from: number, to: number): number {
  let sum = 0;
  for (const m of STREAK_XP) if (m.days > from && m.days <= to) sum += m.xp;
  return sum;
}

// The next milestone strictly beyond `current` days, or null past the top.
export function nextStreakMilestone(
  current: number,
): { days: number; xp: number } | null {
  return STREAK_XP.find((m) => m.days > current) ?? null;
}

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
