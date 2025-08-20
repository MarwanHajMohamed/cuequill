import { useQuery } from "@tanstack/react-query";

export type Trade = {
  _id: string;
  symbol: string;
  dateBought: string;
  status: "OPEN" | "WIN" | "LOSS";
  option: "CALL" | "PUT";
  qty: number;
  expiryDate: string;
  strategy: string;
  spotPrice: string;
  contractPrice: string;
  strike: string;
  closingSpotPrice: string;
  closingContractPrice: string;
  profitLoss: string;
  notes: string;
};

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
