import { useMemo } from "react";
import { useEconDates } from "./useEconDates";

/**
 * US PPI (Producer Price Index) release dates as a Set of "yyyy-MM-dd".
 *
 * Backed by /api/econ-dates (FRED), which keeps the schedule current
 * automatically; the local BLS list in lib/ppiDates is the instant/offline
 * fallback used until the fetch resolves (and whenever it can't).
 */
export function usePpiDates(): Set<string> {
  const { ppi } = useEconDates();
  return useMemo(() => new Set(ppi), [ppi]);
}
