import { useMemo } from "react";
import { getYearMarketDays, type MarketDay } from "@/lib/marketHolidays";

/**
 * NYSE non-standard sessions as a Map of "yyyy-MM-dd" → MarketDay, where
 * each entry is either a full-day closure or a 1pm early close.
 *
 * Mirrors useFedDates for the calendar, but the dates are computed
 * locally (they're fixed by rule years in advance) rather than fetched —
 * so they render instantly and work offline. Covers a generous window
 * around the current year for back/forward navigation.
 */
export function useMarketHolidays(): Map<string, MarketDay> {
  return useMemo(() => {
    const now = new Date().getFullYear();
    const map = new Map<string, MarketDay>();
    for (let y = now - 12; y <= now + 12; y++) {
      for (const [date, day] of getYearMarketDays(y)) map.set(date, day);
    }
    return map;
  }, []);
}
