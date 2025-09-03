import { Trade } from "@/app/types/Trades";
import { useQuery } from "@tanstack/react-query";

const fetchTrades = async (userId: string): Promise<Trade[]> => {
  const res = await fetch(`/api/trades?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch trades");
  return res.json();
};

export function useTrades(userId?: string) {
  return useQuery<Trade[]>({
    queryKey: ["trades", userId],
    queryFn: () => {
      if (!userId) throw new Error("userId is required");
      return fetchTrades(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
