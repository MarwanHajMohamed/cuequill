"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DashboardInsight = {
  insight: string;
  generatedAt: string | null;
  cached: boolean;
};

async function fetchInsight(refresh: boolean): Promise<DashboardInsight> {
  const res = await fetch(
    `/api/dashboard/insight${refresh ? "?refresh=1" : ""}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load insight");
  return data as DashboardInsight;
}

// The dashboard "Insight of the day". Cached server-side per local day, so
// this query is cheap and stable; `enabled` lets the caller skip it for
// non-Pro users. The refresh mutation forces a fresh generation.
export function useDashboardInsight(enabled: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["dashboardInsight"],
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: () => fetchInsight(false),
  });

  const refresh = useMutation({
    mutationFn: () => fetchInsight(true),
    onSuccess: (data) => qc.setQueryData(["dashboardInsight"], data),
  });

  return { ...query, refresh };
}
