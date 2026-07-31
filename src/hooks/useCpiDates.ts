import { useMemo } from "react";
import { useEconDates } from "./useEconDates";

/**
 * US CPI (inflation report) release dates as a Set of "yyyy-MM-dd".
 *
 * Backed by /api/econ-dates (FRED), which keeps the schedule current
 * automatically; the local BLS list in lib/cpiDates is the instant/offline
 * fallback used until the fetch resolves (and whenever it can't).
 */
export function useCpiDates(): Set<string> {
  const { cpi } = useEconDates();
  return useMemo(() => new Set(cpi), [cpi]);
}
