import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrades } from "./useTrades";
import { useTransactions } from "./useTransactions";
import { useProfile } from "./useProfile";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

export type BalancePoint = {
  date: string; // yyyy-MM-dd
  balance: number; // running: cumulative flows + trade P/L
  tradingCum: number; // running: trade P/L only
  flowCum: number; // running: net deposits (deposits − withdrawals)
};

const isoDay = (d: string | Date) =>
  new Date(d).toISOString().split("T")[0];

// The account balance as a derived running total: manual deposits (+) and
// withdrawals (−), plus realized net P/L from every closed (real) trade,
// accumulated in date order. Because it recomputes from all events each
// time, a back-dated deposit correctly shifts every later day — including
// today's balance — without touching the trades.
export function useBalanceTimeline() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // Real money only — simulated trades never affect the account balance.
  const { data: trades = [], isLoading: loadingTrades } = useTrades(
    userId,
    false,
  );
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: profile } = useProfile();
  const startingBalance = profile?.startingBalance ?? 0;

  const points = useMemo<BalancePoint[]>(() => {
    const flowByDay = new Map<string, number>();
    const tradeByDay = new Map<string, number>();

    for (const t of transactions) {
      const day = isoDay(t.date);
      // DEPOSIT adds, WITHDRAW subtracts, ADJUST (reconciliation) is already a
      // signed correction — apply it as-is.
      const signed =
        t.type === "DEPOSIT"
          ? t.amount
          : t.type === "WITHDRAW"
            ? -t.amount
            : t.amount;
      flowByDay.set(day, (flowByDay.get(day) ?? 0) + signed);
    }

    for (const tr of trades) {
      if (tr.status === "OPEN") continue; // unrealized — not in balance yet
      const day = isoDay(tr.dateClosed ?? tr.expiryDate ?? tr.dateBought);
      tradeByDay.set(day, (tradeByDay.get(day) ?? 0) + tradeNetPL(tr));
    }

    const days = [
      ...new Set([...flowByDay.keys(), ...tradeByDay.keys()]),
    ].sort();

    // If there are no events but the user set an opening balance, still
    // show a single point so the balance card/page isn't empty.
    if (days.length === 0 && startingBalance !== 0) {
      const today = new Date().toISOString().split("T")[0];
      return [
        { date: today, balance: startingBalance, tradingCum: 0, flowCum: 0 },
      ];
    }

    let flow = 0;
    let trad = 0;
    return days.map((date) => {
      flow += flowByDay.get(date) ?? 0;
      trad += tradeByDay.get(date) ?? 0;
      // The opening balance is a fixed baseline under the whole line.
      return {
        date,
        balance: startingBalance + flow + trad,
        tradingCum: trad,
        flowCum: flow,
      };
    });
  }, [trades, transactions, startingBalance]);

  return {
    points,
    loading: loadingTrades || loadingTx,
    hasData: points.length > 0,
  };
}
