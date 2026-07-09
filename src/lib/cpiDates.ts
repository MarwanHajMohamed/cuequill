// US CPI (Consumer Price Index) release dates — the headline monthly
// inflation report, published by the BLS at 8:30am ET. There's no clean
// free API for the schedule, so it's hard-coded from the official BLS
// release calendar and needs updating once a year when BLS publishes
// the next year's dates:
//   https://www.bls.gov/schedule/news_release/cpi.htm
//
// Each entry is the RELEASE day (yyyy-MM-dd), not the reference month.
// Verify against the BLS calendar before relying on any single date —
// individual dates occasionally shift.
export const CPI_RELEASE_DATES: string[] = [
  // 2025
  "2025-01-15",
  "2025-02-12",
  "2025-03-12",
  "2025-04-10",
  "2025-05-13",
  "2025-06-11",
  "2025-07-15",
  "2025-08-12",
  "2025-09-11",
  "2025-10-15",
  "2025-11-13",
  "2025-12-18",
  // 2026
  "2026-01-13",
  "2026-02-11",
  "2026-03-11",
  "2026-04-10",
  "2026-05-12",
  "2026-06-10",
  "2026-07-14",
  "2026-08-12",
  "2026-09-11",
  "2026-10-13",
  "2026-11-18",
  "2026-12-10",
];
