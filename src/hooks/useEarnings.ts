import { useQuery } from "@tanstack/react-query";
import type { EarningsEntry } from "@/app/api/earnings/route";

async function fetchEarnings(symbols: string[]): Promise<EarningsEntry[]> {
  if (symbols.length === 0) return [];
  const res = await fetch(`/api/earnings?symbols=${symbols.join(",")}`);
  if (!res.ok) throw new Error("Failed to load earnings");
  const data = await res.json();
  return data.entries ?? [];
}

export function useEarnings(symbols: string[]) {
  // Stable key regardless of input order.
  const key = [...symbols].sort();
  return useQuery<EarningsEntry[]>({
    queryKey: ["earnings", key],
    queryFn: () => fetchEarnings(key),
    enabled: symbols.length > 0,
    // Earnings dates move rarely; cache generously.
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
  });
}
