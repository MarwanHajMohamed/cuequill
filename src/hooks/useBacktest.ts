"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Bar, BacktestConfig } from "@/lib/backtest/types";

export type SavedBacktest = {
  id: string;
  name: string;
  config: BacktestConfig;
  updatedAt: string;
};

// Daily bars for a symbol (cached server-side; react-query caches on the
// client). Disabled until a symbol is set (i.e. the user hits Run).
export function useBacktestPrices(symbol: string | null) {
  return useQuery({
    queryKey: ["backtestPrices", symbol],
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<Bar[]> => {
      const res = await fetch(
        `/api/backtest/prices?symbol=${encodeURIComponent(symbol!)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load prices");
      return data.bars as Bar[];
    },
  });
}

// Turn a plain-English strategy description into a BacktestConfig via the
// AI parser. The user reviews the result before running.
export function useParseStrategy() {
  return useMutation({
    mutationFn: async (text: string): Promise<BacktestConfig> => {
      const res = await fetch("/api/backtest/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        let msg = "Failed to build strategy";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          const t = await res.text();
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      return data.config as BacktestConfig;
    },
  });
}

export function useSavedBacktests() {
  return useQuery({
    queryKey: ["backtests"],
    queryFn: async (): Promise<SavedBacktest[]> => {
      const res = await fetch("/api/backtest");
      if (!res.ok) throw new Error("Failed to load saved backtests");
      const data = await res.json();
      return data.items as SavedBacktest[];
    },
  });
}

export function useSaveBacktest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      config: BacktestConfig;
    }): Promise<SavedBacktest> => {
      const res = await fetch(
        input.id ? `/api/backtest/${input.id}` : "/api/backtest",
        {
          method: input.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: input.name, config: input.config }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backtests"] }),
  });
}

export function useDeleteBacktest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/backtest/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backtests"] }),
  });
}
