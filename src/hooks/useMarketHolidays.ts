import { useMemo } from "react";
import { getYearHolidays } from "@/lib/marketHolidays";

/**
 * NYSE full-day market closures as a Map of "yyyy-MM-dd" → holiday name.
 *
 * Mirrors useFedDates for the calendar, but the dates are computed
 * locally (they're fixed by rule years in advance) rather than fetched —
 * so they render instantly and work offline. Covers a generous window
 * around the current year for back/forward navigation.
 */
export function useMarketHolidays(): Map<string, string> {
  return useMemo(() => {
    const now = new Date().getFullYear();
    const map = new Map<string, string>();
    for (let y = now - 12; y <= now + 12; y++) {
      for (const [date, name] of getYearHolidays(y)) map.set(date, name);
    }
    return map;
  }, []);
}
