"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useBalanceTimeline } from "@/hooks/useBalanceTimeline";
import { fmtMoneyFull, fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { CARD_CLASS_BASE } from "../DashboardCard";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as ReTooltip,
} from "recharts";

// Account-balance summary: the running total (deposits/withdrawals +
// realized trade P/L), its change over the tracked window, and a
// sparkline - linking through to the full /balance page.
export default function DashboardBalance() {
  const { points, loading, hasData } = useBalanceTimeline();
  // Index of the point under the cursor (null = not hovering).
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const view = useMemo(() => {
    if (points.length === 0) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const change = last.balance - first.balance;
    const pct =
      first.balance !== 0 ? (change / Math.abs(first.balance)) * 100 : null;
    return { latest: last.balance, change, pct, count: points.length };
  }, [points]);

  // Split into "past" (up to the cursor, full) and "future" (after it,
  // dimmed - "not reached yet"); they share the hovered point so the line
  // stays continuous. No hover → everything is "past".
  const chartData = useMemo(
    () =>
      points.map((p, i) => ({
        ...p,
        past: hoverIndex == null || i <= hoverIndex ? p.balance : null,
        future: hoverIndex != null && i >= hoverIndex ? p.balance : null,
      })),
    [points, hoverIndex],
  );

  const hoverPoint =
    hoverIndex != null ? (points[hoverIndex] ?? null) : null;

  if (loading) return null;

  if (!hasData || !view) {
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
          Log a deposit and your balance tracks every closed trade from there.
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
          <div className="text-sm md:text-base font-semibold">Balance</div>
          <i className="fa-solid fa-chevron-right text-[10px] text-white/30" />
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="text-xl md:text-2xl font-normal tracking-tight tabular-nums">
            {fmtMoneyFull(hoverPoint ? hoverPoint.balance : view.latest)}
          </div>
          {hoverPoint ? (
            <div className="text-[12px] md:text-[13px] text-white/50 tabular-nums">
              {new Date(hoverPoint.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          ) : (
            <div
              className={`text-[12px] md:text-[13px] font-medium tabular-nums ${
                up ? "text-green-400" : "text-red-400"
              }`}
            >
              {fmtMoneySignedCompact(view.change)}
              {view.pct != null && (
                <span className="text-white/40 ml-1">
                  ({up ? "+" : "−"}
                  {Math.abs(view.pct).toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="w-full flex-1 min-h-[72px] md:min-h-[96px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              onMouseMove={(s) => {
                const st = s as {
                  activeTooltipIndex?: number | string | null;
                  activeIndex?: number | string | null;
                  isTooltipActive?: boolean;
                };
                // recharts 3 reports the index as a string.
                const raw = st.activeTooltipIndex ?? st.activeIndex;
                const idx = raw == null || raw === "" ? NaN : Number(raw);
                setHoverIndex(
                  st.isTooltipActive && Number.isInteger(idx) && idx >= 0
                    ? idx
                    : null,
                );
              }}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="dashBalanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="dashBalanceFillDim"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.07} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* Reached so far - full strength. */}
              <Area
                type="monotone"
                dataKey="past"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#dashBalanceFill)"
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Not reached yet - dimmed. */}
              <Area
                type="monotone"
                dataKey="future"
                stroke={chartColor}
                strokeOpacity={0.22}
                strokeWidth={2}
                fill="url(#dashBalanceFillDim)"
                connectNulls={false}
                isAnimationActive={false}
              />
              <ReTooltip
                cursor={{ stroke: "var(--hairline)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0]?.payload as
                    | (typeof chartData)[number]
                    | undefined;
                  if (!row) return null;
                  return (
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--hairline)",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "var(--foreground)",
                        padding: "4px 8px",
                      }}
                    >
                      <div style={{ opacity: 0.6 }}>
                        {new Date(label as string).toLocaleDateString()}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        Balance: {fmtMoneyFull(row.balance)}
                      </div>
                    </div>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </Link>
  );
}
