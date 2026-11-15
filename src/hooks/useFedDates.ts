import { useMemo } from "react";
import { useEconDates } from "@/hooks/useEconDates";

export type FedDates = {
  meetings: Set<string>; // rate-decision days
  minutes: Set<string>; // minutes-release days (3 weeks after each meeting)
};

/**
 * FOMC dates - rate-decision meetings and minutes-release days - as Sets of
 * "yyyy-MM-dd" strings. Sourced from the consolidated /api/econ-dates pull
 * (Fed-calendar-backed with a hard-coded fallback) via useEconDates, so FOMC
 * stays in sync with the CPI/PPI/PCE calendar data.
 */
export function useFedDates(): FedDates {
  const { fomc, fomcMinutes } = useEconDates();
  return useMemo(
    () => ({
      meetings: new Set(fomc),
      minutes: new Set(fomcMinutes),
    }),
    [fomc, fomcMinutes],
  );
}
