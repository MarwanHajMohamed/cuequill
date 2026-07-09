// US PCE (Personal Consumption Expenditures) price index release dates —
// the "Personal Income and Outlays" report from the BEA, which contains the
// PCE price index, the Fed's preferred inflation gauge. Released at 8:30am ET.
// There's no clean free API for the schedule, so it's hard-coded from the
// official BEA release schedule and needs updating once a year:
//   https://www.bea.gov/news/schedule
//
// Each entry is the RELEASE day (yyyy-MM-dd), not the reference month.
// Verify against the BEA schedule before relying on any single date —
// individual dates occasionally shift.
export const PCE_RELEASE_DATES: string[] = [
  // 2025
  "2025-01-31",
  "2025-02-28",
  "2025-03-28",
  "2025-04-30",
  "2025-05-30",
  "2025-06-27",
  "2025-07-31",
  "2025-08-29",
  "2025-09-26",
  "2025-10-31",
  "2025-11-26",
  "2025-12-19",
  // 2026
  "2026-01-30",
  "2026-02-27",
  "2026-03-27",
  "2026-04-30",
  "2026-05-29",
  "2026-06-26",
  "2026-07-31",
  "2026-08-28",
  "2026-09-25",
  "2026-10-30",
  "2026-11-25",
  "2026-12-23",
];
