// lib/cron/time.ts
//
// Shared helpers for the hourly push crons: a single auth check and timezone
// math so one hourly fire can serve every user at their own local hour. Mirrors
// the logic already proven in the affirmations-reminder cron.

export function checkCronAuth(req: Request): { ok: boolean; reason: string } {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (req.headers.get("x-vercel-cron")) return { ok: true, reason: "vercel" };
  if (!secret) return { ok: true, reason: "no-secret-open" };
  if (!auth) return { ok: false, reason: "no Authorization header was received" };
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, reason: "Authorization header did not match CRON_SECRET" };
  }
  return { ok: true, reason: "bearer" };
}

// Current hour (0–23) in an IANA timezone, falling back to UTC on a bad zone.
export function localHour(now: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const h = parts.find((p) => p.type === "hour")?.value ?? "0";
    const n = Number(h);
    return n === 24 ? 0 : n;
  } catch {
    return now.getUTCHours();
  }
}

// Local calendar date (yyyy-MM-dd) in a timezone, optionally offset by N days.
export function localDate(now: Date, tz: string, offsetDays = 0): string {
  const base =
    offsetDays === 0 ? now : new Date(now.getTime() + offsetDays * 86400000);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(base);
  } catch {
    return base.toISOString().split("T")[0];
  }
}

// Short weekday ("Mon", "Sat", …) in a timezone.
export function localWeekday(now: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
    }).format(now);
  } catch {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getUTCDay()];
  }
}

export function isWeekend(now: Date, tz: string): boolean {
  const d = localWeekday(now, tz);
  return d === "Sat" || d === "Sun";
}
