import { useQuery } from "@tanstack/react-query";

export type Transaction = {
  date: string; // ISO
  amount: number;
  type: "TRADE" | "DEPOSIT" | "WITHDRAW";
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  const res = await fetch("/api/transactions");
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// Deposits / withdrawals ledger (session-scoped), used to neutralise cash
// flows when charting balance so the line reflects trading performance
// rather than money moving in and out. Read-only here.
export function useTransactions(enabled = true) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
