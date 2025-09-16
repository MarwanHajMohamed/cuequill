import { useTrades } from "./useTrades";
import { useBalance } from "./useBalance";
import { format } from "date-fns";
import { BalanceEvent } from "@/app/types/Transactions";

export function usePortfolioHistory(userId: string) {
  const { data: transactions = [], loading: loadingTx } = useBalance(userId);
  const { data: trades = [], isLoading: loadingTrades } = useTrades(userId);

  if (loadingTx || loadingTrades) {
    return { data: [], loading: true };
  }

  const txEvents = transactions.map((t: BalanceEvent) => ({
    date: new Date(t.date),
    type: t.type,
    amount: t.type === "DEPOSIT" ? t.amount : -t.amount,
  }));

  const tradeEvents = trades
    .filter((t) => t.status !== "OPEN" && t.profitLoss !== undefined)
    .map((t) => ({
      date: new Date(t.dateClosed ?? t.expiryDate),
      type: "TRADE",
      amount: t.profitLoss!,
    }));

  const allEvents = [...txEvents, ...tradeEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // group by day
  const grouped: Record<string, number> = {};
  for (const e of allEvents) {
    const key = format(e.date, "yyyy-MM-dd");
    grouped[key] = (grouped[key] ?? 0) + e.amount;
  }

  const dailyEvents = Object.entries(grouped)
    .map(([day, amount]) => ({ date: new Date(day), amount }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // running balance
  let runningBalance = 0;
  const history = dailyEvents.map((e) => {
    runningBalance += e.amount;
    return { date: format(e.date, "MMM dd"), balance: runningBalance };
  });

  return { data: history, loading: false };
}
