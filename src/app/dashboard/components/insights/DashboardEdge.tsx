"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { Trade } from "@/app/types/Trades";
import { CARD_CLASS } from "../DashboardCard";

// Strategy edge ranking: which strategies carry a positive expectancy
// (avg net P/L per trade) and which are leaking. Needs a minimum sample
// per strategy before it'll rank one.

const MIN_N_FOR_EDGE = 5;
const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

type StratEdge = {
  label: string;
  n: number;
  expectancy: number;
  winRate: number;
  total: number;
};

export default function DashboardEdge({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const ranked = useMemo<StratEdge[]>(() => {
    if (!trades) return [];
    const groups = new Map<string, Trade[]>();
    for (const t of trades.filter(isClosed)) {
      const k = t.strategy ?? "-";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(t);
    }
    const rows: StratEdge[] = [];
    for (const [label, list] of groups) {
      if (list.length < MIN_N_FOR_EDGE) continue;
      const total = list.reduce((s, t) => s + tradeNetPL(t), 0);
      const wins = list.filter((t) => t.status === "WIN").length;
      rows.push({
        label,
        n: list.length,
        expectancy: total / list.length,
        winRate: (wins / list.length) * 100,
        total,
      });
    }
    rows.sort((a, b) => b.expectancy - a.expectancy);
    return rows;
  }, [trades]);

  if (isLoading || !trades) return null;

  // If <=4, just show all; otherwise top 3 + bottom 3 with a divider.
  const showSplit = ranked.length > 4;
  const top = showSplit ? ranked.slice(0, 3) : ranked;
  const bot = showSplit ? ranked.slice(-3).reverse() : [];
  const maxExp = Math.max(...ranked.map((r) => Math.abs(r.expectancy)), 1);

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
      <div className="text-sm md:text-base font-semibold">Strategy edge</div>
      {ranked.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          Need ≥{MIN_N_FOR_EDGE} closed trades per strategy to rank edge.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {top.length > 0 && (
            <RankGroup label="Working" tone="good" rows={top} maxExp={maxExp} />
          )}
          {bot.length > 0 && (
            <RankGroup label="Leaking" tone="bad" rows={bot} maxExp={maxExp} />
          )}
        </div>
      )}
    </section>
  );
}

function RankGroup({
  label,
  tone,
  rows,
  maxExp,
}: {
  label: string;
  tone: "good" | "bad";
  rows: StratEdge[];
  maxExp: number;
}) {
  const accent = tone === "good" ? "text-green-400" : "text-red-400";
  const bar = tone === "good" ? "bg-green-500/60" : "bg-red-500/60";
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`text-[10px] tracking-[0.08em] font-medium ${accent}`}>
        {label}
      </div>
      {rows.map((r) => {
        const width = (Math.abs(r.expectancy) / maxExp) * 100;
        return (
          <div
            key={r.label}
            className="flex items-center gap-2.5 text-[12px] md:text-[13px]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-white/85 truncate">{r.label}</span>
                <span
                  className={`${accent} tabular-nums font-normal whitespace-nowrap`}
                >
                  {r.expectancy >= 0 ? "+" : "−"}$
                  {Math.abs(r.expectancy).toFixed(2)}
                  <span className="text-white/35 font-normal">/trade</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-0.5">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="text-[10px] text-white/40 tabular-nums mt-0.5">
                {r.n} trades · {r.winRate.toFixed(0)}% win ·{" "}
                {fmtMoneySignedCompact(r.total)} total
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
