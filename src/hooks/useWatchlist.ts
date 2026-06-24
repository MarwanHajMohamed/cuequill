import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchWatchlist(): Promise<string[]> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("Failed to load watchlist");
  const data = await res.json();
  return data.symbols ?? [];
}

async function saveWatchlist(symbols: string[]): Promise<string[]> {
  const res = await fetch("/api/watchlist", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error("Failed to save watchlist");
  const data = await res.json();
  return data.symbols ?? [];
}

export function useWatchlist() {
  const qc = useQueryClient();
  const query = useQuery<string[]>({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: saveWatchlist,
    // Optimistic: reflect the edit immediately, roll back on error.
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["watchlist"] });
      const prev = qc.getQueryData<string[]>(["watchlist"]);
      qc.setQueryData(["watchlist"], next);
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev);
    },
    onSuccess: (saved) => qc.setQueryData(["watchlist"], saved),
  });

  return { ...query, save: mutation.mutate, saving: mutation.isPending };
}
