"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip as ReTooltip,
} from "recharts";
import { type ReportTable } from "@/lib/reports";

// Net-P/L bar chart for single-category aggregate reports. Split into its own
// module so recharts is code-split out of the reports route's initial bundle
// (loaded lazily via next/dynamic from the page).

function fmtUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function ReportChart({ table }: { table: ReportTable }) {
  const netIdx = table.columns.indexOf("Net P/L");
  if (netIdx < 0) return null;

  const data = table.rows.map((r) => ({
    label: String(r[0]),
    net: typeof r[netIdx] === "number" ? (r[netIdx] as number) : 0,
  }));
  // Angle the labels once they'd collide, and reserve enough axis height
  // for the longest one so nothing gets clipped.
  const angled = data.length > 6;
  const longest = data.reduce((m, d) => Math.max(m, d.label.length), 0);
  const axisH = angled ? Math.min(120, 30 + longest * 6) : 24;

  return (
    <div className="shrink-0 h-[300px] rounded-xl border border-white/10 bg-[var(--surface-2)] p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--foreground)" }}
            interval={0}
            angle={angled ? -35 : 0}
            textAnchor={angled ? "end" : "middle"}
            height={axisH}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--foreground)" }}
            width={52}
            tickFormatter={(v) => fmtUsd(Number(v))}
          />
          <ReferenceLine y={0} stroke="var(--hairline)" />
          <ReTooltip
            cursor={{ fill: "rgb(var(--fg-rgb) / 0.05)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            // Recharts colours the item/label text inline (black by default),
            // overriding contentStyle - set them explicitly so the text stays
            // legible in dark mode.
            itemStyle={{ color: "var(--foreground)" }}
            labelStyle={{ color: "var(--foreground)" }}
            formatter={(v: number | string) => [fmtUsd(Number(v)), "Net P/L"]}
          />
          <Bar dataKey="net" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? "#22c55e" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
