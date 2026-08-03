import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaderboardEntry } from "@/app/api/leaderboard/route";

export type { LeaderboardEntry };

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  optedIn: boolean;
};

async function fetchLeaderboard(): Promise<LeaderboardData> {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

export function useLeaderboard(enabled = true) {
  return useQuery<LeaderboardData>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
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
      const prev = qc.getQueryData<LeaderboardData>(["leaderboard"]);
      if (prev) qc.setQueryData(["leaderboard"], { ...prev, optedIn: optIn });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leaderboard"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leaderboard"] }),
  });
}
