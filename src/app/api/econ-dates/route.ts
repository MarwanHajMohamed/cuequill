// app/api/econ-dates/route.ts
//
// Economic-calendar dates (CPI, PPI, PCE, FOMC) for the calendar, pulled from
// upstream sources so the schedule stays current automatically instead of
// relying on the hand-maintained lists in lib/*Dates.ts.
//
// CPI / PPI / PCE come from the FRED API (St. Louis Fed). FRED "release/dates"
// returns every past + scheduled release date for a release id:
//   CPI (Consumer Price Index)            -> release_id 10
//   PPI (Producer Price Index)            -> release_id 46
//   PCE (Personal Income and Outlays)     -> release_id 21
// Requires a free FRED API key in FRED_API_KEY.
//
// FOMC meeting + minutes dates can't come from FRED (release/dates only logs
// when data is published, so no-change meetings would be missed), so they're
// scraped from the Fed's own FOMC calendar via lib/fedCalendar.
//
// If any source fails, we fall back to the local hard-coded lists so the
// calendar keeps working (just without automatic updates).

import { NextResponse } from "next/server";
import { CPI_RELEASE_DATES } from "@/lib/cpiDates";
import { PPI_RELEASE_DATES } from "@/lib/ppiDates";
import { PCE_RELEASE_DATES } from "@/lib/pceDates";
import { FOMC_MEETING_DATES, FOMC_MINUTES_DATES } from "@/lib/fomcDates";
import { fetchFomcEvents, splitFomcEvents } from "@/lib/fedCalendar";

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

// FOMC meeting + minutes dates from the Fed calendar, falling back to the
// hard-coded lists on any failure.
async function fetchFomcDates(): Promise<{
  fomc: string[];
  fomcMinutes: string[];
}> {
  try {
    const { meetings, minutes } = splitFomcEvents(await fetchFomcEvents());
    if (meetings.length > 0) {
      return { fomc: meetings, fomcMinutes: minutes };
    }
  } catch {
    // Fall through to the hard-coded lists.
  }
  return { fomc: FOMC_MEETING_DATES, fomcMinutes: FOMC_MINUTES_DATES };
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;

  const out: Record<Series, string[]> = { ...FALLBACK };
  const fredPromise = apiKey
    ? Promise.all(
        (Object.entries(RELEASES) as [Series, number][]).map(
          async ([key, id]) => {
            try {
              const dates = await fetchReleaseDates(id, apiKey);
              // Only replace the fallback if FRED actually returned dates.
              if (dates.length > 0) out[key] = dates;
            } catch {
              // Keep the fallback list for this series on any failure.
            }
          },
        ),
      )
    : Promise.resolve();

  const [, fomc] = await Promise.all([fredPromise, fetchFomcDates()]);

  return NextResponse.json({
    ...out,
    fomc: fomc.fomc,
    fomcMinutes: fomc.fomcMinutes,
    source: apiKey ? "fred" : "fallback",
  });
}
