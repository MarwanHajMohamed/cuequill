import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaderboardEntry } from "@/app/api/leaderboard/route";

export type { LeaderboardEntry };

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  optedIn: boolean;
};

export type LeaderboardScope = "all" | "friends";

async function fetchLeaderboard(
  scope: LeaderboardScope,
): Promise<LeaderboardData> {
  const qs = scope === "friends" ? "?scope=friends" : "";
  const res = await fetch(`/api/leaderboard${qs}`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

export function useLeaderboard(scope: LeaderboardScope = "all", enabled = true) {
  return useQuery<LeaderboardData>({
    queryKey: ["leaderboard", scope],
    queryFn: () => fetchLeaderboard(scope),
    enabled,
    staleTime: 60_000,
  });
}

// Join / leave the leaderboard. Optimistically flips the caller's opt-in
// state, then refetches so their own row appears (or disappears).
export function useLeaderboardOptIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (optIn: boolean) => {
      const res = await fetch("/api/leaderboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn }),
      });
      if (!res.ok) throw new Error("Failed to update leaderboard setting");
      return (await res.json()) as { optedIn: boolean };
    },
    onMutate: async (optIn) => {
      await qc.cancelQueries({ queryKey: ["leaderboard"] });
      // Patch every cached scope ("all"/"friends") so the join/leave state
      // flips instantly regardless of which board is showing.
      const prev = qc.getQueriesData<LeaderboardData>({
        queryKey: ["leaderboard"],
      });
      for (const [key, data] of prev) {
        if (data) qc.setQueryData(key, { ...data, optedIn: optIn });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      for (const [key, data] of ctx?.prev ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leaderboard"] }),
  });
}
