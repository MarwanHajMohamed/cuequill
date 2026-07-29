import { useQuery } from "@tanstack/react-query";

export type BalanceSnapshot = {
  _id: string;
  date: string; // yyyy-MM-dd
  balance: number;
  currency: string | null;
  source: "ibkr" | "manual";
};

const fetchSnapshots = async (): Promise<BalanceSnapshot[]> => {
  const res = await fetch("/api/balance");
  if (!res.ok) throw new Error("Failed to fetch balance");
  const data = await res.json();
  return data.snapshots ?? [];
};

// The account-balance timeline (oldest first): daily NAV from IBKR plus
// manual snapshots. Distinct from `useBalance`, which is the running
// deposits/withdrawals ledger. Shared query key so the dashboard card and
// the /balance page stay in sync and a manual add / delete / sync can
// invalidate one place.
export function useBalanceSnapshots(enabled = true) {
  return useQuery<BalanceSnapshot[]>({
    queryKey: ["balanceSnapshots"],
    queryFn: fetchSnapshots,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
