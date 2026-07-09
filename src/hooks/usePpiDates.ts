import { useMemo } from "react";
import { PPI_RELEASE_DATES } from "@/lib/ppiDates";

/**
 * US PPI (Producer Price Index) release dates as a Set of "yyyy-MM-dd".
 *
 * Mirrors useCpiDates: the dates are a fixed, locally-known schedule (from
 * the BLS release calendar in lib/ppiDates), so they render instantly and
 * work offline — no fetch required.
 */
export function usePpiDates(): Set<string> {
  return useMemo(() => new Set(PPI_RELEASE_DATES), []);
}
