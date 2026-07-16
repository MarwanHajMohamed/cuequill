"use client";

import { useQuery } from "@tanstack/react-query";

export type ClientQuote = {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  marketState: string | null;
  name: string | null;
  time: string | null;
};

// Live(ish) quotes for a set of symbols, keyed by uppercase symbol.
// Refetches on an interval so an open dashboard stays current. Disabled
// when there are no symbols to look up.
export function useQuotes(symbols: string[]) {
  const key = Array.from(new Set(symbols.map((s) => s.toUpperCase())))
    .filter(Boolean)
    .sort();
  return useQuery({
    queryKey: ["quotes", key],
    enabled: key.length > 0,
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Record<string, ClientQuote>> => {
      const res = await fetch(
        `/api/quote?symbols=${encodeURIComponent(key.join(","))}`,
      );
      if (!res.ok) throw new Error("Failed to load quotes");
      const data = await res.json();
      return (data.quotes ?? {}) as Record<string, ClientQuote>;
    },
  });
}
