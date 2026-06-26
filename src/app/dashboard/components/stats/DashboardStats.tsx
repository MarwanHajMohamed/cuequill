"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as ReTooltip,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────
type Summary = {
  count: number;
  netPL: number;
  winRate: number; // 0-100
};

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

const summarize = (trades: Trade[]): Summary => {
  const closed = trades.filter(isClosed);
  const wins = closed.filter((t) => t.status === "WIN").length;
  return {
    count: closed.length,
    netPL: closed.reduce((s, t) => s + tradeNetPL(t), 0),
    winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
  };
};

const exitDate = (t: Trade): Date =>
  new Date(t.dateClosed || t.dateBought);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfWeek = (d: Date) => {
  // ISO week: Monday start
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
};

const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);

// ─── Tiles ────────────────────────────────────────────────────────────
function PeriodTile({
  label,
  summary,
  highlight = false,
}: {
  label: string;
  summary: Summary;
  highlight?: boolean;
}) {
  const positive = summary.netPL >= 0;
  return (
    <div
      className={`border rounded-lg p-3 md:p-4 flex flex-col gap-1 md:gap-2 min-w-0 basis-[150px] md:basis-[220px] grow md:max-w-[320px] ${
        highlight ? "border-white/20 bg-white/5" : "border-[var(--hairline)]"
      }`}
    >
      <div className="text-[10px] md:text-xs text-white/50 tracking-wide">
        {label}
      </div>
      <div
        className={`text-base md:text-2xl font-normal truncate ${
          summary.count === 0
            ? "text-white/40"
            : positive
              ? "text-green-500"
              : "text-red-500"
        }`}
      >
        {summary.count === 0
          ? "-"
          : `${positive ? "+" : "−"}$${Math.abs(summary.netPL).toFixed(2)}`}
      </div>
      <div className="text-[11px] md:text-xs text-white/50 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>
          {summary.count} trade{summary.count === 1 ? "" : "s"}
        </span>
        {summary.count > 0 && (
          <>
            <span className="text-white/20">·</span>
            <span>{summary.winRate.toFixed(0)}% win rate</span>
          </>
        )}
      </div>
    </div>
  );
}

function MiniTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "neutral";
}) {
  const valueColor =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-white";
  return (
    <div className="border border-[var(--hairline)] rounded-lg p-2 md:p-3 flex flex-col gap-1 min-w-0 basis-[120px] md:basis-[180px] grow md:max-w-[240px]">
      <div className="text-[10px] md:text-xs text-white/50 tracking-wide truncate">
        {label}
      </div>
      <div
        className={`text-sm md:text-base font-normal truncate ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────
export default function DashboardStats({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const stats = useMemo(() => {
    if (!trades) return null;
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const closed = trades.filter(isClosed);
    const open = trades.filter((t) => t.status === "OPEN");

    const today = summarize(
      closed.filter((t) => exitDate(t) >= todayStart),
    );
    const week = summarize(
      closed.filter((t) => exitDate(t) >= weekStart),
    );
    const month = summarize(
      closed.filter((t) => exitDate(t) >= monthStart),
    );
    const allTime = summarize(closed);

    // Current streak - chronologically newest first.
    const closedSorted = [...closed].sort(
      (a, b) => exitDate(b).getTime() - exitDate(a).getTime(),
    );
    let streakKind: "WIN" | "LOSS" | null = null;
    let streakLen = 0;
    for (const t of closedSorted) {
      if (streakKind === null) {
        streakKind = t.status === "WIN" ? "WIN" : "LOSS";
        streakLen = 1;
      } else if (t.status === streakKind) {
        streakLen++;
      } else break;
    }

    // Top-performing strategy this month (by net P/L)
    const stratByMonth = new Map<
      string,
      { net: number; n: number }
    >();
    for (const t of closed.filter((c) => exitDate(c) >= monthStart)) {
      const k = t.strategy ?? "-";
      const prev = stratByMonth.get(k) ?? { net: 0, n: 0 };
      prev.net += tradeNetPL(t);
      prev.n += 1;
      stratByMonth.set(k, prev);
    }
    let topStrategy: { label: string; net: number; n: number } | null = null;
    for (const [label, v] of stratByMonth) {
      if (!topStrategy || v.net > topStrategy.net)
        topStrategy = { label, net: v.net, n: v.n };
    }

    // Equity curve - last 30 closed trades, cumulative net P/L
    const recentChrono = [...closed]
      .sort((a, b) => exitDate(a).getTime() - exitDate(b).getTime())
      .slice(-30);
    let cum = 0;
    const curve = recentChrono.map((t, i) => {
      cum += tradeNetPL(t);
      return { idx: i, cum, date: exitDate(t).toLocaleDateString() };
    });

    return {
      today,
      week,
      month,
      allTime,
      streakKind,
      streakLen,
      openCount: open.length,
      topStrategy,
      curve,
    };
  }, [trades]);

  if (isLoading || !trades) {
    return (
      <div className="text-white/40 text-sm py-20">
        Loading dashboard stats…
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center text-white/40 text-sm py-20">
        You haven&apos;t made any trades yet. Add one to see your dashboard.
      </div>
    );
  }

  const s = stats!;
  const curveEnd = s.curve.length > 0 ? s.curve[s.curve.length - 1].cum : 0;
  const curveStart = s.curve.length > 0 ? s.curve[0].cum : 0;
  const curveColor =
    curveEnd >= curveStart ? "#22c55e" : "#ef4444";

  return (
    <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-2">
        <h2 className="md:text-xl text-sm font-bold">At a glance</h2>
      </div>

      {/* Period summaries */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <PeriodTile label="Today" summary={s.today} highlight />
        <PeriodTile label="This week" summary={s.week} />
        <PeriodTile label="This month" summary={s.month} />
      </div>

      {/* Mini tiles row */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <MiniTile
          label="All-time net P/L"
          value={
            s.allTime.count === 0
              ? "-"
              : `${fmtMoneySignedCompact(s.allTime.netPL)}`
          }
          tone={
            s.allTime.count === 0
              ? "neutral"
              : s.allTime.netPL >= 0
                ? "good"
                : "bad"
          }
        />
        <MiniTile
          label="Current streak"
          value={
            s.streakKind === null
              ? "-"
              : `${s.streakKind === "WIN" ? "W" : "L"} × ${s.streakLen}`
          }
          tone={
            s.streakKind === "WIN"
              ? "good"
              : s.streakKind === "LOSS"
                ? "bad"
                : "neutral"
          }
        />
        <MiniTile
          label="Open positions"
          value={s.openCount > 0 ? `${s.openCount}` : "-"}
          tone={s.openCount > 0 ? "neutral" : "neutral"}
        />
        <MiniTile
          label="Top strategy MTD"
          value={
            s.topStrategy && s.topStrategy.n > 0 ? (
              <span className="flex items-center gap-1.5 truncate">
                <span className="truncate">{s.topStrategy.label}</span>
                <span
                  className={`text-[10px] md:text-xs ${
                    s.topStrategy.net >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {s.topStrategy.net >= 0 ? "+" : "−"}$
                  {Math.abs(s.topStrategy.net).toFixed(0)}
                </span>
              </span>
            ) : (
              "-"
            )
          }
        />
      </div>

      {/* Equity sparkline */}
      {s.curve.length >= 2 && (
        <div className="border border-[var(--hairline)] rounded-lg p-3 md:p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[10px] md:text-xs text-white/50 tracking-wide">
              Recent equity ({s.curve.length} trades)
            </div>
            <div
              className={`text-sm md:text-base font-normal ${
                curveEnd - curveStart >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {curveEnd - curveStart >= 0 ? "+" : "−"}$
              {Math.abs(curveEnd - curveStart).toFixed(2)}
            </div>
          </div>
          <div className="w-full h-24 md:h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={s.curve}
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient
                    id="dashEquityFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={curveColor}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={curveColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="cum"
                  stroke={curveColor}
                  strokeWidth={2}
                  fill="url(#dashEquityFill)"
                />
                <ReTooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date ?? ""
                  }
                  formatter={(v: number) => [
                    `${fmtMoneySignedCompact(v)}`,
                    "Cumulative",
                  ]}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
