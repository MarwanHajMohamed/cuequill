import { useQuery } from "@tanstack/react-query";

export type Transaction = {
  _id: string;
  date: string; // ISO
  amount: number; // positive for DEPOSIT/WITHDRAW; signed for ADJUST
  type: "DEPOSIT" | "WITHDRAW" | "ADJUST";
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  const res = await fetch("/api/transactions");
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// Deposits / withdrawals ledger (session-scoped). Combined with realized
// trade P/L, this drives the running account balance. Shared query key so
// the dashboard card and the /balance page stay in sync.
export function useTransactions(enabled = true) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
