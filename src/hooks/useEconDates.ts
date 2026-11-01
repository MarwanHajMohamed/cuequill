import { useQuery } from "@tanstack/react-query";
import { CPI_RELEASE_DATES } from "@/lib/cpiDates";
import { PPI_RELEASE_DATES } from "@/lib/ppiDates";
import { PCE_RELEASE_DATES } from "@/lib/pceDates";

// Economic-report release dates (CPI / PPI / PCE) as arrays of "yyyy-MM-dd".
// Sourced from /api/econ-dates (FRED-backed, with a hard-coded fallback). A
// single React Query so the three per-series hooks share one request.
export type EconDates = { cpi: string[]; ppi: string[]; pce: string[] };

const FALLBACK: EconDates = {
  cpi: CPI_RELEASE_DATES,
  ppi: PPI_RELEASE_DATES,
  pce: PCE_RELEASE_DATES,
};

async function fetchEconDates(): Promise<EconDates> {
  const res = await fetch("/api/econ-dates");
  if (!res.ok) throw new Error("Failed to fetch economic dates");
  const d = (await res.json()) as Partial<EconDates>;
  return {
    cpi: Array.isArray(d.cpi) ? d.cpi : FALLBACK.cpi,
    ppi: Array.isArray(d.ppi) ? d.ppi : FALLBACK.ppi,
    pce: Array.isArray(d.pce) ? d.pce : FALLBACK.pce,
  };
}

export function useEconDates(): EconDates {
  const { data } = useQuery<EconDates>({
    queryKey: ["econ-dates"],
    queryFn: fetchEconDates,
    // Schedules change rarely; render the local lists instantly, refresh daily.
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    placeholderData: FALLBACK,
  });
  return data ?? FALLBACK;
}
