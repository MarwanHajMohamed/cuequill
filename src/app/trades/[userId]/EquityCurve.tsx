"use client";

import { Trade } from "@/app/types/Trades";
import { format } from "date-fns";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  equity: number;
  drawdown: number;
};

export default function EquityCurve({ trades }: { trades: Trade[] }) {
  // Sort closed trades chronologically and compute running cumulative P/L,
  // running peak, and drawdown (current - peak, always <= 0).
  const closed = [...trades]
    .filter((t) => t.status === "WIN" || t.status === "LOSS")
    .sort(
      (a, b) =>
        new Date(a.dateBought).getTime() - new Date(b.dateBought).getTime(),
    );

  if (closed.length === 0) {
    return (
      <div className="border border-[#282828] rounded-lg p-6 text-center text-sm text-white/40">
        Equity curve will appear once you have closed trades.
      </div>
    );
  }

  let cum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const data: Point[] = closed.map((t) => {
    cum += t.profitLoss ?? 0;
    if (cum > peak) peak = cum;
    const drawdown = cum - peak;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    return {
      date: t.dateBought.split("T")[0],
      equity: Math.round(cum * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
    };
  });

  const currentEquity = data[data.length - 1].equity;

  return (
    <div className="border border-[#282828] rounded-lg p-4 md:p-6 w-full">
      <div className="flex justify-between items-baseline mb-4 flex-wrap gap-2">
        <div className="text-sm font-semibold">Equity curve</div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-white/40">Current:</span>{" "}
            <span
              className={
                currentEquity >= 0 ? "text-green-500" : "text-red-500"
              }
            >
              {currentEquity >= 0 ? "+" : "−"}${Math.abs(currentEquity).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-white/40">Max drawdown:</span>{" "}
            <span className="text-red-500">
              −${Math.abs(maxDrawdown).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      <div className="w-full h-56 md:h-64">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#282828"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#666", fontSize: 10 }}
              tickFormatter={(d) => format(new Date(d), "MMM d")}
              minTickGap={40}
              stroke="#333"
            />
            <YAxis
              tick={{ fill: "#666", fontSize: 10 }}
              stroke="#333"
              tickFormatter={(v) => `$${v}`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "#16151B",
                border: "1px solid #282828",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#fff", marginBottom: 4 }}
              labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")}
              formatter={(v: number, name: string) => [
                `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`,
                name,
              ]}
            />
            <ReferenceLine y={0} stroke="#444" />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#dc2626"
              strokeWidth={1}
              fill="url(#ddFill)"
              isAnimationActive={false}
              dot={false}
              name="Drawdown"
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#equityFill)"
              isAnimationActive={false}
              dot={false}
              name="Equity"
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              strokeWidth={2}
              isAnimationActive={false}
              dot={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
