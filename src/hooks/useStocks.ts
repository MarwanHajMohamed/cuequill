"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockRow } from "@/lib/stocksSeed";

export type { StockRow } from "@/lib/stocksSeed";

async function fetchStocks(): Promise<StockRow[]> {
  const res = await fetch("/api/stocks");
  if (!res.ok) throw new Error("Failed to load stocks");
  const data = await res.json();
  return data.rows as StockRow[];
}

export function useStocks() {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: fetchStocks,
    staleTime: 30_000,
  });
}

// Saves the entire table (the API replaces the rows array wholesale) and
// primes the cache with the server's normalized response.
export function useSaveStocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: StockRow[]): Promise<StockRow[]> => {
      const res = await fetch("/api/stocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Failed to save stocks");
      const data = await res.json();
      return data.rows as StockRow[];
    },
    onSuccess: (rows) => {
      qc.setQueryData(["stocks"], rows);
    },
  });
}
