// FOMC rate-decision dates - the day the Federal Open Market Committee
// announces its interest-rate decision (day 2 of each two-day meeting). Pulled
// live from the Fed's FOMC calendar via /api/econ-dates; this list is the
// hard-coded fallback used when that scrape is unavailable, mirroring the
// CPI/PPI/PCE lists. Update once a year from the official schedule:
//   https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
//
// Each entry is the DECISION day (yyyy-MM-dd). 2026/2027 dates were "tentative"
// when the Fed announced them, so verify against the calendar before relying on
// any single date.
import { addDaysIso } from "@/lib/fedCalendar";

export const FOMC_MEETING_DATES: string[] = [
  // 2025
  "2025-01-29",
  "2025-03-19",
  "2025-05-07",
  "2025-06-18",
  "2025-07-30",
  "2025-09-17",
  "2025-10-29",
  "2025-12-10",
  // 2026
  "2026-01-28",
  "2026-03-18",
  "2026-04-29",
  "2026-06-17",
  "2026-07-29",
  "2026-09-16",
  "2026-10-28",
  "2026-12-09",
  // 2027
  "2027-01-27",
  "2027-03-17",
  "2027-04-28",
  "2027-06-09",
  "2027-07-28",
  "2027-09-15",
  "2027-10-27",
  "2027-12-08",
];

// Minutes are released three weeks (21 days) to the day after each meeting.
export const FOMC_MINUTES_DATES: string[] = FOMC_MEETING_DATES.map((d) =>
  addDaysIso(d, 21),
);
