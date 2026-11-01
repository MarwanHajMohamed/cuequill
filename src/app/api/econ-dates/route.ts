// app/api/econ-dates/route.ts
//
// Economic-report release dates (CPI, PPI, PCE) for the calendar. Pulled from
// the FRED API (St. Louis Fed) so the schedule stays current automatically
// instead of relying on the hand-maintained lists in lib/*Dates.ts.
//
// FRED "release/dates" returns every past + scheduled release date for a
// release id:
//   CPI (Consumer Price Index)            -> release_id 10
//   PPI (Producer Price Index)            -> release_id 46
//   PCE (Personal Income and Outlays)     -> release_id 21
//
// Requires a free FRED API key in FRED_API_KEY. If the key is missing or a
// request fails, we fall back to the local hard-coded lists so the calendar
// keeps working (just without automatic updates).

import { NextResponse } from "next/server";
import { CPI_RELEASE_DATES } from "@/lib/cpiDates";
import { PPI_RELEASE_DATES } from "@/lib/ppiDates";
import { PCE_RELEASE_DATES } from "@/lib/pceDates";

// Refresh at most once a day - release schedules change rarely.
export const revalidate = 86400;

const FRED_URL = "https://api.stlouisfed.org/fred/release/dates";
const RELEASES = { cpi: 10, ppi: 46, pce: 21 } as const;
type Series = keyof typeof RELEASES;

const FALLBACK: Record<Series, string[]> = {
  cpi: CPI_RELEASE_DATES,
  ppi: PPI_RELEASE_DATES,
  pce: PCE_RELEASE_DATES,
};

async function fetchReleaseDates(
  releaseId: number,
  apiKey: string,
): Promise<string[]> {
  const url =
    `${FRED_URL}?release_id=${releaseId}&api_key=${apiKey}` +
    `&file_type=json&include_release_dates_with_no_data=true&sort_order=asc`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`FRED ${releaseId}: ${res.status}`);
  const data = (await res.json()) as {
    release_dates?: { date?: string }[];
  };
  const dates = (data.release_dates ?? [])
    .map((d) => d.date)
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  return Array.from(new Set(dates));
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...FALLBACK, source: "fallback" });
  }

  const out: Record<Series, string[]> = { ...FALLBACK };
  await Promise.all(
    (Object.entries(RELEASES) as [Series, number][]).map(async ([key, id]) => {
      try {
        const dates = await fetchReleaseDates(id, apiKey);
        // Only replace the fallback if FRED actually returned dates.
        if (dates.length > 0) out[key] = dates;
      } catch {
        // Keep the fallback list for this series on any failure.
      }
    }),
  );

  return NextResponse.json({ ...out, source: "fred" });
}
