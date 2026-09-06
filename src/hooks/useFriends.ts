import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FriendMini } from "@/app/api/friends/route";
import type { FriendStatus } from "@/lib/friends";

export type { FriendMini, FriendStatus };

export type FriendsData = {
  friends: FriendMini[];
  incoming: FriendMini[]; // requests waiting on me
  outgoing: FriendMini[]; // requests I've sent
};

export type FriendAction =
  | "request"
  | "accept"
  | "decline"
  | "cancel"
  | "remove";

async function fetchFriends(): Promise<FriendsData> {
  const res = await fetch("/api/friends");
  if (!res.ok) throw new Error("Failed to load friends");
  return res.json();
}

// The caller's friends plus pending requests in both directions.
export function useFriends(enabled = true) {
  return useQuery<FriendsData>({
    queryKey: ["friends"],
    queryFn: fetchFriends,
    enabled,
    staleTime: 30_000,
  });
}

// Change a friend relationship. Invalidates the affected views so the profile
// card, friends lists, and the friends leaderboard all reflect the new state.
export function useFriendAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { action: FriendAction; userId: string }) => {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't update friend");
      return d as { status: FriendStatus };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["userProfile", vars.userId] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
