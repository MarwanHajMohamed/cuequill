// US PPI (Producer Price Index) release dates — the wholesale/producer-side
// inflation report, published by the BLS at 8:30am ET, usually a day before
// or after the CPI release. There's no clean free API for the schedule, so
// it's hard-coded from the official BLS release calendar and needs updating
// once a year when BLS publishes the next year's dates:
//   https://www.bls.gov/schedule/news_release/ppi.htm
//
// Each entry is the RELEASE day (yyyy-MM-dd), not the reference month.
// Verify against the BLS calendar before relying on any single date —
// individual dates occasionally shift.
export const PPI_RELEASE_DATES: string[] = [
  // 2025
  "2025-01-14",
  "2025-02-13",
  "2025-03-13",
  "2025-04-11",
  "2025-05-15",
  "2025-06-12",
  "2025-07-16",
  "2025-08-14",
  "2025-09-10",
  "2025-10-16",
  "2025-11-14",
  "2025-12-11",
  // 2026
  "2026-01-15",
  "2026-02-19",
  "2026-03-12",
  "2026-04-14",
  "2026-05-14",
  "2026-06-11",
  "2026-07-16",
  "2026-08-13",
  "2026-09-15",
  "2026-10-15",
  "2026-11-19",
  "2026-12-11",
];
