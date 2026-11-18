// lib/econ/calendar.ts
//
// Server-side helper to find which economic-calendar events fall on a given
// day. Pulls from the same /api/econ-dates endpoint the calendar UI uses
// (FRED-backed CPI/PPI/PCE + Fed-calendar FOMC, with hard-coded fallbacks), so
// the push reminders and the on-screen calendar never disagree.

import { CPI_RELEASE_DATES } from "@/lib/cpiDates";
import { PPI_RELEASE_DATES } from "@/lib/ppiDates";
import { PCE_RELEASE_DATES } from "@/lib/pceDates";
import { FOMC_MEETING_DATES, FOMC_MINUTES_DATES } from "@/lib/fomcDates";

export type EconEventKind = "fomc" | "fomcMinutes" | "cpi" | "ppi" | "pce";
export type EconEvent = { kind: EconEventKind; label: string };

export type EconCalendar = {
  cpi: Set<string>;
  ppi: Set<string>;
  pce: Set<string>;
  fomc: Set<string>;
  fomcMinutes: Set<string>;
};

const FALLBACK = {
  cpi: CPI_RELEASE_DATES,
  ppi: PPI_RELEASE_DATES,
  pce: PCE_RELEASE_DATES,
  fomc: FOMC_MEETING_DATES,
  fomcMinutes: FOMC_MINUTES_DATES,
};

// Fetch the calendar once per cron run. Falls back to the hard-coded lists on
// any failure so a reminder still fires if the endpoint is briefly down.
export async function fetchEconCalendar(appUrl: string): Promise<EconCalendar> {
  let data: Partial<Record<keyof typeof FALLBACK, string[]>> = {};
  try {
    const res = await fetch(`${appUrl}/api/econ-dates`, {
      headers: { "User-Agent": "cuequill-cron/1.0" },
    });
    if (res.ok) data = await res.json();
  } catch {
    /* use fallback */
  }
  const pick = (k: keyof typeof FALLBACK) =>
    new Set(Array.isArray(data[k]) ? (data[k] as string[]) : FALLBACK[k]);
  return {
    cpi: pick("cpi"),
    ppi: pick("ppi"),
    pce: pick("pce"),
    fomc: pick("fomc"),
    fomcMinutes: pick("fomcMinutes"),
  };
}

// Human labels for a push notification.
const LABELS: Record<EconEventKind, string> = {
  fomc: "FOMC rate decision",
  fomcMinutes: "FOMC minutes",
  cpi: "CPI release",
  ppi: "PPI release",
  pce: "PCE release",
};

// Events landing on a specific "yyyy-MM-dd". Order = market impact.
export function eventsForDate(cal: EconCalendar, iso: string): EconEvent[] {
  const out: EconEvent[] = [];
  const order: EconEventKind[] = ["fomc", "cpi", "ppi", "pce", "fomcMinutes"];
  for (const kind of order) {
    if (cal[kind].has(iso)) out.push({ kind, label: LABELS[kind] });
  }
  return out;
}
