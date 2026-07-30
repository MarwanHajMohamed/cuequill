import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EMPTY_STREAK,
  type AffirmationStreak,
} from "@/lib/affirmationStreak";

export type AffirmationsRead = { date: string; texts: string[] };
type AffirmationsData = {
  affirmations: string[];
  read: AffirmationsRead;
  streak: AffirmationStreak;
};

const KEY = ["affirmations"];

async function fetchAffirmations(): Promise<AffirmationsData> {
  const res = await fetch("/api/affirmations");
  if (!res.ok) throw new Error("Failed to load affirmations");
  const data = await res.json();
  return {
    affirmations: data.affirmations ?? [],
    read: data.read ?? { date: "", texts: [] },
    streak: data.streak ?? EMPTY_STREAK,
  };
}

async function saveList(items: string[]): Promise<string[]> {
  const res = await fetch("/api/affirmations", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ affirmations: items }),
  });
  if (!res.ok) throw new Error("Failed to save affirmations");
  const data = await res.json();
  return data.affirmations ?? [];
}

async function saveRead(read: AffirmationsRead): Promise<{
  read: AffirmationsRead;
  streak: AffirmationStreak;
  xpGained: number;
}> {
  const res = await fetch("/api/affirmations/read", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(read),
  });
  if (!res.ok) throw new Error("Failed to save read state");
  const data = await res.json();
  return {
    read: data.read ?? read,
    streak: data.streak ?? EMPTY_STREAK,
    xpGained: typeof data.xpGained === "number" ? data.xpGained : 0,
  };
}

export function useAffirmations(onStreakXp?: (xp: number) => void) {
  const qc = useQueryClient();
  const query = useQuery<AffirmationsData>({
    queryKey: KEY,
    queryFn: fetchAffirmations,
    staleTime: 5 * 60_000,
  });

  const listMutation = useMutation({
    mutationFn: saveList,
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<AffirmationsData>(KEY);
      if (prev) qc.setQueryData(KEY, { ...prev, affirmations: next });
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSuccess: (saved) =>
      qc.setQueryData<AffirmationsData>(KEY, (old) =>
        old ? { ...old, affirmations: saved } : old,
      ),
  });

  const readMutation = useMutation({
    mutationFn: saveRead,
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<AffirmationsData>(KEY);
      if (prev) qc.setQueryData(KEY, { ...prev, read: next });
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSuccess: ({ read, streak, xpGained }) => {
      qc.setQueryData<AffirmationsData>(KEY, (old) =>
        old ? { ...old, read, streak } : old,
      );
      // Streak XP changes the account level/title — refresh anything that
      // reads it (navbar level, challenges, nameplate) and notify the page.
      if (xpGained > 0) {
        qc.invalidateQueries({ queryKey: ["profile"] });
        qc.invalidateQueries({ queryKey: ["challenges"] });
        onStreakXp?.(xpGained);
      }
    },
  });

  return {
    affirmations: query.data?.affirmations ?? [],
    read: query.data?.read ?? { date: "", texts: [] },
    streak: query.data?.streak ?? EMPTY_STREAK,
    isLoading: query.isLoading,
    saveList: listMutation.mutate,
    saveRead: readMutation.mutate,
    saving: listMutation.isPending,
  };
}
