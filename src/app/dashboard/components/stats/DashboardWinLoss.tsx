"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { Trade } from "@/app/types/Trades";
import { CARD_CLASS } from "../DashboardCard";

// Win / loss breakdown for closed trades: the win-rate split bar plus the
// three numbers that actually describe an edge — average winner, average
// loser, and profit factor (gross profit ÷ gross loss). Hidden until
// there's at least one closed trade to summarise.

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-white";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="text-[10px] md:text-xs text-white/50 tracking-wide truncate">
        {label}
      </div>
      <div
        className={`text-base md:text-lg font-normal tabular-nums truncate ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardWinLoss({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const stats = useMemo(() => {
    if (!trades) return null;
    const closed = trades.filter(isClosed);
    if (closed.length === 0) return null;

    const wins = closed.filter((t) => t.status === "WIN");
    const losses = closed.filter((t) => t.status === "LOSS");
    const grossProfit = wins.reduce((s, t) => s + tradeNetPL(t), 0);
    // Losing trades carry negative net P/L; flip to a positive magnitude.
    const grossLoss = -losses.reduce((s, t) => s + tradeNetPL(t), 0);

    const winRate = (wins.length / closed.length) * 100;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    // Profit factor is undefined with no losses — show it as "∞" then.
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

    return {
      total: closed.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
    };
  }, [trades]);

  if (isLoading || !trades) return null;

  if (!stats) {
    return (
      <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
        <h2 className="text-sm md:text-base font-semibold">Win / loss</h2>
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          No closed trades yet.
        </div>
      </section>
    );
  }

  const winPct = stats.winRate;
  const pfLabel =
    stats.profitFactor === null
      ? stats.winCount > 0
        ? "∞"
        : "—"
      : stats.profitFactor.toFixed(2);
  const pfTone =
    stats.profitFactor === null
      ? stats.winCount > 0
        ? "good"
        : "neutral"
      : stats.profitFactor >= 1
        ? "good"
        : "bad";

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-4 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">Win / loss</h2>
        <span className="text-[11px] md:text-xs text-white/45 tabular-nums">
          {stats.total} closed
        </span>
      </div>

      {/* Win-rate split bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl md:text-3xl font-normal tabular-nums tracking-tight">
            {winPct.toFixed(0)}%
          </span>
          <span className="text-[11px] text-white/45 tabular-nums">
            {stats.winCount}W · {stats.lossCount}L
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full bg-green-500/70"
            style={{ width: `${winPct}%` }}
          />
          <div
            className="h-full bg-red-500/60"
            style={{ width: `${100 - winPct}%` }}
          />
        </div>
      </div>

      {/* Edge numbers */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <Stat
          label="Avg win"
          value={`+$${stats.avgWin.toFixed(0)}`}
          tone="good"
        />
        <Stat
          label="Avg loss"
          value={stats.lossCount > 0 ? `−$${stats.avgLoss.toFixed(0)}` : "—"}
          tone={stats.lossCount > 0 ? "bad" : "neutral"}
        />
        <Stat label="Profit factor" value={pfLabel} tone={pfTone} />
      </div>
    </section>
  );
}
