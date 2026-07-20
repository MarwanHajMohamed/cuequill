"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import Link from "next/link";
import { useTrades } from "@/hooks/useTrades";
import { fmtMoneySignedCompact, fmtMoneyCompact } from "@/lib/helpers/fmt";
import { computeStrategyStats, type Slice } from "@/lib/strategyStats";

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
    () => computeStrategyStats(trades ?? [], strategyName),
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13px] font-semibold">Performance</div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/40">
            {s.total} used · {s.closedCount} closed
            {s.openCount > 0 ? ` · ${s.openCount} open` : ""}
          </span>
          <Link
            href={`/chat?prompt=${encodeURIComponent(
              `Analyse my "${strategyName}" strategy using its stats — what's working, what's my biggest leak, and how can I tighten it up?`,
            )}`}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-teal-300 hover:text-teal-200 border border-teal-500/25 hover:border-teal-400/40 rounded-full px-2.5 py-1 transition"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
            Ask Quill
          </Link>
        </div>
      </div>

      {/* Leak callout — the slice bleeding the most, or an all-clear. */}
      {s.closedCount >= 3 &&
        (s.leak ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3.5 py-2.5 text-[12.5px] text-red-300 leading-relaxed">
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
              <AreaChart
                data={s.equity}
                margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
              >
                {/* Split the fill + stroke at y=0 so the curve is green
                    above break-even and red below it. */}
                <defs>
                  <linearGradient id="stratFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset={s.zeroOffset} stopColor="#2dd4bf" stopOpacity={0.04} />
                    <stop offset={s.zeroOffset} stopColor="#f87171" stopOpacity={0.04} />
                    <stop offset="1" stopColor="#f87171" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="stratStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={s.zeroOffset} stopColor="#2dd4bf" />
                    <stop offset={s.zeroOffset} stopColor="#f87171" />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="url(#stratStroke)"
                  strokeWidth={2}
                  fill="url(#stratFill)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
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
