import { useMemo } from "react";
import { PCE_RELEASE_DATES } from "@/lib/pceDates";

/**
 * US PCE (Fed's preferred inflation gauge) release dates as a Set of
 * "yyyy-MM-dd".
 *
 * Mirrors useCpiDates: the dates are a fixed, locally-known schedule (from
 * the BEA release calendar in lib/pceDates), so they render instantly and
 * work offline — no fetch required.
 */
export function usePceDates(): Set<string> {
  return useMemo(() => new Set(PCE_RELEASE_DATES), []);
}
