import { useMemo } from "react";
import { CPI_RELEASE_DATES } from "@/lib/cpiDates";

/**
 * US CPI (inflation report) release dates as a Set of "yyyy-MM-dd".
 *
 * Mirrors useMarketHolidays: the dates are a fixed, locally-known
 * schedule (from the BLS release calendar in lib/cpiDates), so they
 * render instantly and work offline — no fetch required.
 */
export function useCpiDates(): Set<string> {
  return useMemo(() => new Set(CPI_RELEASE_DATES), []);
}
