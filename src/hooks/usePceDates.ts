import { useMemo } from "react";
import { useEconDates } from "./useEconDates";

/**
 * US PCE (Fed's preferred inflation gauge) release dates as a Set of
 * "yyyy-MM-dd".
 *
 * Backed by /api/econ-dates (FRED), which keeps the schedule current
 * automatically; the local BEA list in lib/pceDates is the instant/offline
 * fallback used until the fetch resolves (and whenever it can't).
 */
export function usePceDates(): Set<string> {
  const { pce } = useEconDates();
  return useMemo(() => new Set(pce), [pce]);
}
