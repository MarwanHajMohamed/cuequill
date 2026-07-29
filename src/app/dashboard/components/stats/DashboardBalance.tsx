"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useBalanceSnapshots } from "@/hooks/useBalanceSnapshots";
import { fmtCurrency } from "@/lib/helpers/fmt";
import { CARD_CLASS_BASE } from "../DashboardCard";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as ReTooltip,
} from "recharts";

// Broker-balance summary: the latest account value, its change over the
// tracked window, and a sparkline — linking through to the full /balance
// page. Data comes from IBKR NAV pulls and/or manual snapshots.
export default function DashboardBalance() {
  const { data: snapshots, isLoading } = useBalanceSnapshots();

  const view = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;
    const series = snapshots.map((s) => ({
      date: s.date,
      balance: s.balance,
    }));
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const change = last.balance - first.balance;
    const pct = first.balance !== 0 ? (change / Math.abs(first.balance)) * 100 : null;
    return {
      series,
      currency: last.currency,
      latest: last.balance,
      change,
      pct,
      count: snapshots.length,
    };
  }, [snapshots]);

  if (isLoading) return null;

  if (!view) {
    return (
      <section className={`${CARD_CLASS_BASE} flex flex-col gap-2 h-full`}>
        <div className="flex items-center justify-between">
          <div className="text-sm md:text-base font-semibold">Balance</div>
          <Link
            href="/balance"
            className="text-[11px] text-teal-300 hover:text-teal-200 transition"
          >
            Set up
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          Track your account value — connect IBKR or add a snapshot on the
          balance page.
        </div>
      </section>
    );
  }

  const up = view.change >= 0;
  const chartColor = up ? "#22c55e" : "#ef4444";

  return (
    <Link href="/balance" className="block h-full">
      <section
        className={`${CARD_CLASS_BASE} flex flex-col gap-2 h-full hover:border-white/20 transition`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm md:text-base font-semibold">
            Balance{" "}
            <span className="text-white/40 font-normal text-[11px] md:text-xs">
              ({view.count} {view.count === 1 ? "point" : "points"})
            </span>
          </div>
          <i className="fa-solid fa-chevron-right text-[10px] text-white/30" />
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="text-xl md:text-2xl font-normal tracking-tight tabular-nums">
            {fmtCurrency(view.latest, view.currency)}
          </div>
          <div
            className={`text-[12px] md:text-[13px] font-medium tabular-nums ${
              up ? "text-green-400" : "text-red-400"
            }`}
          >
            {up ? "+" : "−"}
            {fmtCurrency(Math.abs(view.change), view.currency, true)}
            {view.pct != null && (
              <span className="text-white/40 ml-1">
                ({up ? "+" : "−"}
                {Math.abs(view.pct).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        <div className="w-full flex-1 min-h-[72px] md:min-h-[96px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={view.series}
              margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="dashBalanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="balance"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#dashBalanceFill)"
              />
              <ReTooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--foreground)",
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                formatter={(v: number) => [
                  fmtCurrency(v, view.currency),
                  "Balance",
                ]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </Link>
  );
}
