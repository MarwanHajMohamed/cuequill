// Deterministic NYSE full-day market closures.
//
// Unlike FOMC meetings (scraped live via /api/fed), NYSE holidays are
// fixed by rule years in advance, so we compute them locally. That's
// more reliable and works offline — the calendar surfaces them with the
// same badge treatment as Fed days.
//
// Covers full-day closures only (not the early-close half days before
// Independence Day / Thanksgiving / Christmas).

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// nth (1-based) `weekday` (0=Sun..6=Sat) of a 1-based `month`.
function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (nth - 1) * 7;
  return new Date(Date.UTC(year, month - 1, day));
}

// Last `weekday` of a 1-based `month`.
function lastWeekday(year: number, month: number, weekday: number): Date {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay();
  const day = daysInMonth - ((lastDow - weekday + 7) % 7);
  return new Date(Date.UTC(year, month - 1, day));
}

// Easter Sunday (Gregorian) — Meeus/Jones/Butcher algorithm.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const addDays = (d: Date, n: number) =>
  new Date(d.getTime() + n * 86400000);

// NYSE observance for a fixed-date holiday: Saturday → preceding Friday,
// Sunday → following Monday.
function observed(d: Date): Date {
  const dow = d.getUTCDay();
  if (dow === 6) return addDays(d, -1);
  if (dow === 0) return addDays(d, 1);
  return d;
}

const cache = new Map<number, Map<string, string>>();

// Map of "yyyy-MM-dd" → holiday name for all NYSE full-day closures in a
// given calendar year. Memoized per year.
export function getYearHolidays(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const out = new Map<string, string>();
  const add = (d: Date, name: string) => out.set(isoOf(d), name);

  // New Year's Day. NYSE does NOT close the preceding Friday when Jan 1
  // falls on a Saturday — only shift forward off a Sunday.
  const newYear = new Date(Date.UTC(year, 0, 1));
  if (newYear.getUTCDay() !== 6) add(observed(newYear), "New Year's Day");

  add(nthWeekday(year, 1, 1, 3), "Martin Luther King Jr. Day"); // 3rd Mon Jan
  add(nthWeekday(year, 2, 1, 3), "Presidents' Day"); // 3rd Mon Feb
  add(addDays(easterSunday(year), -2), "Good Friday");
  add(lastWeekday(year, 5, 1), "Memorial Day"); // last Mon May

  // Juneteenth — NYSE holiday from 2022 onward.
  if (year >= 2022) {
    add(observed(new Date(Date.UTC(year, 5, 19))), "Juneteenth");
  }

  add(observed(new Date(Date.UTC(year, 6, 4))), "Independence Day");
  add(nthWeekday(year, 9, 1, 1), "Labor Day"); // 1st Mon Sep
  add(nthWeekday(year, 11, 4, 4), "Thanksgiving Day"); // 4th Thu Nov
  add(observed(new Date(Date.UTC(year, 11, 25))), "Christmas Day");

  cache.set(year, out);
  return out;
}
