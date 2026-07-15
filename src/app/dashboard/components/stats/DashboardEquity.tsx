"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { CARD_CLASS } from "../DashboardCard";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as ReTooltip,
} from "recharts";

// Recent-equity sparkline: cumulative net P/L over the last 30 closed
// trades. Its own dashboard cell so it can stack under nothing in the
// grid. Hidden until there are at least two closed trades to draw a line.

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";
const exitDate = (t: Trade): Date => new Date(t.dateClosed || t.dateBought);

export default function DashboardEquity({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades } = useTrades(userId, simulated);

  const curve = useMemo(() => {
    if (!trades) return [];
    const recentChrono = [...trades.filter(isClosed)]
      .sort((a, b) => exitDate(a).getTime() - exitDate(b).getTime())
      .slice(-30);
    let cum = 0;
    return recentChrono.map((t, i) => {
      cum += tradeNetPL(t);
      return { idx: i, cum, date: exitDate(t).toLocaleDateString() };
    });
  }, [trades]);

  if (curve.length < 2) return null;

  const curveEnd = curve[curve.length - 1].cum;
  const curveStart = curve[0].cum;
  const curveColor = curveEnd >= curveStart ? "#22c55e" : "#ef4444";

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-2`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm md:text-base font-semibold">
          Recent equity{" "}
          <span className="text-white/40 font-normal text-[11px] md:text-xs">
            ({curve.length} trades)
          </span>
        </div>
        <div
          className={`text-sm md:text-base font-normal ${
            curveEnd - curveStart >= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {curveEnd - curveStart >= 0 ? "+" : "−"}$
          {Math.abs(curveEnd - curveStart).toFixed(2)}
        </div>
      </div>
      <div className="w-full h-24 md:h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={curve}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="dashEquityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={curveColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={curveColor} stopOpacity={0} />
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
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
              formatter={(v: number) => [
                `${fmtMoneySignedCompact(v)}`,
                "Cumulative",
              ]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
