"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useTrades } from "@/hooks/useTrades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact, fmtMoneyCompact } from "@/lib/helpers/fmt";
import type { Trade } from "@/app/types/Trades";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Slice = {
  key: string;
  label: string;
  dimension: string;
  n: number;
  wins: number;
  net: number;
  winRate: number;
};

function buildSlices(
  closed: Trade[],
  keyer: (t: Trade) => string | null,
  dimension: string,
  labeler: (k: string) => string = (k) => k,
): Slice[] {
  const groups = new Map<string, Trade[]>();
  for (const t of closed) {
    const k = keyer(t);
    if (k == null) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
  }
  return Array.from(groups.entries()).map(([k, ts]) => {
    const wins = ts.filter((t) => t.status === "WIN").length;
    const net = ts.reduce((s, t) => s + tradeNetPL(t), 0);
    return {
      key: k,
      label: labeler(k),
      dimension,
      n: ts.length,
      wins,
      net,
      winRate: ts.length ? (wins / ts.length) * 100 : 0,
    };
  });
}

function computeStats(trades: Trade[] | undefined, name: string) {
  const strat = (trades ?? []).filter((t) => (t.strategy ?? "") === name);
  const closed = strat.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  );
  const open = strat.filter((t) => t.status === "OPEN");
  const wins = closed.filter((t) => t.status === "WIN");
  const losses = closed.filter((t) => t.status === "LOSS");

  const netPL = closed.reduce((s, t) => s + tradeNetPL(t), 0);
  const grossWin = wins.reduce((s, t) => s + tradeNetPL(t), 0);
  const grossLoss = -losses.reduce((s, t) => s + tradeNetPL(t), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = closed.length ? netPL / closed.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;
  const payoff = avgLoss > 0 ? avgWin / avgLoss : null;

  const holdDays = (t: Trade): number | null => {
    if (!t.dateBought || !t.dateClosed) return null;
    const d =
      (new Date(t.dateClosed).getTime() - new Date(t.dateBought).getTime()) /
      86_400_000;
    return Number.isFinite(d) ? Math.max(0, d) : null;
  };
  const avgHold = (ts: Trade[]) => {
    const ds = ts.map(holdDays).filter((d): d is number => d != null);
    return ds.length ? ds.reduce((s, d) => s + d, 0) / ds.length : null;
  };

  // Cumulative equity over closed trades, oldest → newest by exit date.
  const sorted = [...closed].sort(
    (a, b) =>
      new Date(a.dateClosed || a.dateBought).getTime() -
      new Date(b.dateClosed || b.dateBought).getTime(),
  );
  let cum = 0;
  const equity = sorted.map((t, i) => {
    cum += tradeNetPL(t);
    return { i: i + 1, value: cum };
  });

  const byDirection = buildSlices(
    closed,
    (t) => t.option ?? null,
    "direction",
  );
  const bySymbol = buildSlices(closed, (t) => t.symbol || null, "symbol");
  const byWeekday = buildSlices(
    closed,
    (t) => {
      const d = t.dateClosed || t.dateBought;
      if (!d) return null;
      return String(new Date(d).getDay());
    },
    "weekday",
    (k) => WEEKDAYS[Number(k)] ?? k,
  );

  // Leak finder: the slice (with ≥2 trades) that bleeds the most money.
  const leak = [...byDirection, ...bySymbol, ...byWeekday]
    .filter((s) => s.n >= 2 && s.net < 0)
    .sort((a, b) => a.net - b.net)[0];

  return {
    total: strat.length,
    closedCount: closed.length,
    openCount: open.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    netPL,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    payoff,
    best: closed.length ? Math.max(...closed.map(tradeNetPL)) : 0,
    worst: closed.length ? Math.min(...closed.map(tradeNetPL)) : 0,
    avgHoldWin: avgHold(wins),
    avgHoldLoss: avgHold(losses),
    equity,
    byDirection: byDirection.sort((a, b) => a.net - b.net),
    bySymbol: bySymbol.sort((a, b) => a.net - b.net),
    byWeekday,
    leak,
  };
}

function Kpi({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
  hint?: string;
}) {
  const color =
    tone === "good"
      ? "text-green-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-white";
  return (
    <div className="border border-white/10 rounded-xl p-3 flex flex-col gap-0.5 min-w-0 bg-white/[0.02]">
      <div className="text-[10px] md:text-[11px] text-white/45 tracking-wide truncate">
        {label}
      </div>
      <div className={`text-[15px] md:text-lg font-normal tabular-nums ${color}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-white/35 truncate">{hint}</div>}
    </div>
  );
}

function Breakdown({
  title,
  slices,
  worstKey,
}: {
  title: string;
  slices: Slice[];
  worstKey?: string;
}) {
  if (slices.length === 0) return null;
  const maxAbs = Math.max(1, ...slices.map((s) => Math.abs(s.net)));
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {slices.map((s) => {
          const pos = s.net >= 0;
          const isLeak = worstKey === `${s.dimension}:${s.key}`;
          return (
            <div key={s.key} className="flex items-center gap-2.5 text-[12px]">
              <span
                className={`w-14 shrink-0 truncate ${
                  isLeak ? "text-red-300 font-medium" : "text-white/70"
                }`}
              >
                {s.label}
              </span>
              <span className="w-24 shrink-0 text-white/40 tabular-nums text-[11px]">
                {s.n} · {s.winRate.toFixed(0)}% W
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden relative">
                <div
                  className={`absolute top-0 h-full rounded-full ${
                    pos ? "bg-green-500/50" : "bg-red-500/50"
                  }`}
                  style={{
                    width: `${(Math.abs(s.net) / maxAbs) * 100}%`,
                  }}
                />
              </div>
              <span
                className={`w-16 shrink-0 text-right tabular-nums ${
                  pos ? "text-green-400" : "text-red-400"
                }`}
              >
                {fmtMoneySignedCompact(s.net)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CARD =
  "rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 flex flex-col gap-4";

export default function StrategyStats({ strategyName }: { strategyName: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: trades } = useTrades(userId, false);
  const s = useMemo(
    () => computeStats(trades, strategyName),
    [trades, strategyName],
  );

  if (!trades) return null;

  if (s.total === 0) {
    return (
      <div className={CARD}>
        <div className="text-[13px] font-semibold">Performance</div>
        <div className="text-[12.5px] text-white/45 py-4 text-center">
          No trades tagged with this strategy yet. Pick it as the strategy on a
          trade to start tracking its edge here.
        </div>
      </div>
    );
  }

  const worstKey = s.leak ? `${s.leak.dimension}:${s.leak.key}` : undefined;

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold">Performance</div>
        <div className="text-[11px] text-white/40">
          {s.total} used · {s.closedCount} closed
          {s.openCount > 0 ? ` · ${s.openCount} open` : ""}
        </div>
      </div>

      {/* Leak callout — the slice bleeding the most, or an all-clear. */}
      {s.closedCount >= 3 &&
        (s.leak ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-200/90 leading-relaxed">
            <i className="fa-solid fa-magnifying-glass-chart mr-1.5" />
            <span className="font-medium">Biggest leak:</span> {s.leak.label}{" "}
            {s.leak.dimension} — {s.leak.n} trades, {s.leak.winRate.toFixed(0)}%
            win, {fmtMoneySignedCompact(s.leak.net)}. Consider whether this
            slice is worth keeping.
          </div>
        ) : (
          <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-teal-200/90 leading-relaxed">
            <i className="fa-solid fa-circle-check mr-1.5" />
            No obvious leak — every direction, symbol, and weekday slice is net
            positive so far.
          </div>
        ))}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi
          label="Net P/L"
          value={fmtMoneySignedCompact(s.netPL)}
          tone={s.netPL >= 0 ? "good" : "bad"}
        />
        <Kpi label="Win rate" value={`${s.winRate.toFixed(0)}%`} hint={`${s.wins}W / ${s.losses}L`} />
        <Kpi
          label="Expectancy"
          value={fmtMoneySignedCompact(s.expectancy)}
          tone={s.expectancy >= 0 ? "good" : "bad"}
          hint="avg / trade"
        />
        <Kpi
          label="Profit factor"
          value={s.profitFactor == null ? "∞" : s.profitFactor.toFixed(2)}
          tone={s.profitFactor == null || s.profitFactor >= 1 ? "good" : "bad"}
        />
        <Kpi label="Avg win" value={fmtMoneySignedCompact(s.avgWin)} tone="good" />
        <Kpi label="Avg loss" value={fmtMoneySignedCompact(-s.avgLoss)} tone="bad" />
        <Kpi
          label="Payoff ratio"
          value={s.payoff == null ? "—" : `${s.payoff.toFixed(2)}×`}
          hint="avg win ÷ avg loss"
          tone={s.payoff != null && s.payoff >= 1 ? "good" : "bad"}
        />
        <Kpi
          label="Best / worst"
          value={`${fmtMoneyCompact(s.best)} / ${fmtMoneyCompact(s.worst)}`}
        />
      </div>

      {/* Equity curve */}
      {s.equity.length >= 2 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium">
            Cumulative P/L
          </div>
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={s.equity}
                margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--hairline)"
                  vertical={false}
                />
                <XAxis
                  dataKey="i"
                  tick={{ fontSize: 10, fill: "var(--foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--foreground)" }}
                  width={48}
                  tickFormatter={(v: number) => fmtMoneyCompact(v)}
                />
                <ReferenceLine y={0} stroke="var(--hairline)" />
                <ReTooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(l) => `Trade ${l}`}
                  formatter={(v: number) => [fmtMoneyCompact(v), "Cumulative"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={s.netPL >= 0 ? "#2dd4bf" : "#f87171"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Hold-time comparison — a classic leak (holding losers longer). */}
      {(s.avgHoldWin != null || s.avgHoldLoss != null) && (
        <div className="flex items-center gap-4 text-[12px] text-white/55 border-t border-white/[0.06] pt-3">
          <span>
            Avg hold — winners{" "}
            <span className="text-white/85 font-medium tabular-nums">
              {s.avgHoldWin != null ? `${s.avgHoldWin.toFixed(1)}d` : "—"}
            </span>
          </span>
          <span>
            losers{" "}
            <span className="text-white/85 font-medium tabular-nums">
              {s.avgHoldLoss != null ? `${s.avgHoldLoss.toFixed(1)}d` : "—"}
            </span>
          </span>
          {s.avgHoldWin != null &&
            s.avgHoldLoss != null &&
            s.avgHoldLoss > s.avgHoldWin * 1.3 && (
              <span className="text-red-300/80 text-[11px]">
                holding losers longer than winners
              </span>
            )}
        </div>
      )}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-white/[0.06] pt-4">
        <Breakdown
          title="By direction"
          slices={s.byDirection}
          worstKey={worstKey}
        />
        <Breakdown
          title="By weekday"
          slices={s.byWeekday}
          worstKey={worstKey}
        />
        <Breakdown
          title="By symbol"
          slices={s.bySymbol.slice(0, 6)}
          worstKey={worstKey}
        />
      </div>
    </div>
  );
}
