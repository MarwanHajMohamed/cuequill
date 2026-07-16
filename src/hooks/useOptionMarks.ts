"use client";

import { useQuery } from "@tanstack/react-query";

export type OptionType = "CALL" | "PUT";

export type MarkPosition = {
  symbol: string;
  expiry: string; // yyyy-mm-dd
  strike: number;
  type: OptionType;
};

export type OptionMark = {
  occSymbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  mark: number | null;
  asOf: string | null;
};

type OptionQuoteResponse = {
  configured: boolean;
  marks: Record<string, OptionMark>;
  bySymbol: Record<string, string>;
};

// Stable key matching the server's bySymbol map.
export function positionKey(p: MarkPosition): string {
  return `${p.symbol.toUpperCase()}|${p.expiry}|${p.strike}|${p.type}`;
}

// Real option marks (via Tradier) for a set of positions. Returns the raw
// response plus markFor(), which resolves a position to its mark. When the
// provider isn't configured, `configured` is false and callers should fall
// back to the underlying quote. Refetches every 60s.
export function useOptionMarks(positions: MarkPosition[]) {
  const keys = positions
    .map(positionKey)
    .filter(Boolean)
    .sort();

  const query = useQuery({
    queryKey: ["optionMarks", keys],
    enabled: positions.length > 0,
    staleTime: 20 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OptionQuoteResponse> => {
      const res = await fetch("/api/option-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) throw new Error("Failed to load option quotes");
      return res.json();
    },
  });

  const data = query.data;
  const markFor = (p: MarkPosition): OptionMark | null => {
    if (!data) return null;
    const occ = data.bySymbol[positionKey(p)];
    return occ ? (data.marks[occ] ?? null) : null;
  };

  return { ...query, configured: data?.configured ?? false, markFor };
}
