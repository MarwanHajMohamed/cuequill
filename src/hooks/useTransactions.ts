import { useQuery } from "@tanstack/react-query";

export type Transaction = {
  _id: string;
  date: string; // ISO
  amount: number; // positive for DEPOSIT/WITHDRAW; signed for ADJUST
  type: "DEPOSIT" | "WITHDRAW" | "ADJUST";
  simulated: boolean;
};

const fetchTransactions = async (simulated: boolean): Promise<Transaction[]> => {
  const res = await fetch(`/api/transactions?simulated=${simulated}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// Deposits / withdrawals ledger (session-scoped). Combined with realized
// trade P/L, this drives the running account balance. Real and simulated
// (paper) transactions are separate ledgers, keyed apart so the dashboard
// card and the /balance page stay in sync within each mode.
export function useTransactions(simulated = false, enabled = true) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", simulated],
    queryFn: () => fetchTransactions(simulated),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
