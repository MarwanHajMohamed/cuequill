"use client";

import React from "react";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts";
import { fmtMoneyFull, fmtMoneySignedCompact } from "@/lib/helpers/fmt";

// The balance page's area chart, split into its own module so the recharts
// library is code-split out of the balance route's initial bundle (loaded
// lazily via next/dynamic from the page).

export type BalanceChartRow = {
  date: string;
  balance: number;
  tradingCum: number;
  past: number | null;
  future: number | null;
};

type Marker = { x: string; y: number; type: string };

export default function BalanceChart({
  chartData,
  chartColor,
  markers,
  hoverPoint,
  seriesLabel,
  activeKey,
  onHoverIndexChange,
}: {
  chartData: BalanceChartRow[];
  chartColor: string;
  markers: Marker[];
  hoverPoint: { date: string } | null;
  seriesLabel: string;
  activeKey: "tradingCum" | "balance";
  onHoverIndexChange: (i: number | null) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        onMouseMove={(s) => {
          const st = s as {
            activeTooltipIndex?: number | string | null;
            activeIndex?: number | string | null;
            isTooltipActive?: boolean;
          };
          // recharts 3 reports the index as a string.
          const raw = st.activeTooltipIndex ?? st.activeIndex;
          const idx = raw == null || raw === "" ? NaN : Number(raw);
          onHoverIndexChange(
            st.isTooltipActive && Number.isInteger(idx) && idx >= 0
              ? idx
              : null,
          );
        }}
        onMouseLeave={() => onHoverIndexChange(null)}
      >
        <defs>
          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
          {/* Faint fill for the not-yet-reached portion. */}
          <linearGradient id="balFillDim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.06} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: "rgb(var(--fg-rgb) / 0.55)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickFormatter={(d: string) =>
            new Date(d).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis
          width={58}
          tick={{ fill: "rgb(var(--fg-rgb) / 0.55)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => fmtMoneySignedCompact(v)}
        />
        {/* Reached so far - full strength. */}
        <Area
          type="monotone"
          dataKey="past"
          stroke={chartColor}
          strokeWidth={2}
          fill="url(#balFill)"
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
          fill="url(#balFillDim)"
          connectNulls={false}
          isAnimationActive={false}
        />
        {markers.map((m, i) => {
          // Markers after the cursor dim too.
          const dimmed = hoverPoint != null && m.x > hoverPoint.date;
          return (
            <ReferenceDot
              key={`${m.x}-${i}`}
              x={m.x}
              y={m.y}
              r={4}
              fill={
                m.type === "DEPOSIT"
                  ? "#2dd4bf"
                  : m.type === "WITHDRAW"
                    ? "#f59e0b"
                    : "#38bdf8"
              }
              fillOpacity={dimmed ? 0.25 : 1}
              stroke="var(--surface)"
              strokeWidth={2}
              strokeOpacity={dimmed ? 0.25 : 1}
              ifOverflow="extendDomain"
            />
          );
        })}
        <ReTooltip
          cursor={{ stroke: "var(--hairline)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const row = payload[0]?.payload as BalanceChartRow | undefined;
            if (!row) return null;
            return (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--foreground)",
                  padding: "6px 10px",
                }}
              >
                <div style={{ opacity: 0.6 }}>
                  {new Date(label as string).toLocaleDateString()}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {seriesLabel}: {fmtMoneyFull(row[activeKey])}
                </div>
              </div>
            );
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
