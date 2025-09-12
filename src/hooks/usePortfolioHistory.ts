import { useTrades } from "./useTrades";
import { useBalance } from "./useBalance";
import { format } from "date-fns";

export function usePortfolioHistory(userId: string) {
  const { data: transactions = [], loading: loadingTx } = useBalance(userId);
  const { data: trades = [], isLoading: loadingTrades } = useTrades(userId);

  if (loadingTx || loadingTrades) {
    return { data: [], loading: true };
  }

  const txEvents = transactions.map((t) => ({
    date: new Date(t.date),
    type: t.type,
    amount: t.type === "DEPOSIT" ? t.amount : -t.amount,
  }));

  const tradeEvents = trades
    .filter((t) => t.status !== "OPEN" && t.profitLoss !== undefined)
    .map((t) => ({
      date: new Date(t.dateClosed ?? t.expiryDate),
      type: "TRADE",
      amount: t.status === "LOSS" ? -t.profitLoss! : t.profitLoss!,
    }));

  const allEvents = [...txEvents, ...tradeEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let runningBalance = 0;
  const history = allEvents.map((e) => {
    runningBalance += e.amount;

    return {
      date: format(e.date, "MMM dd"),
      balance: runningBalance,
      type: e.type,
    };
  });

  return { data: history, loading: false };
}
