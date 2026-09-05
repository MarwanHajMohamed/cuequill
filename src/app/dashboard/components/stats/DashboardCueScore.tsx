"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { computeCueScore, cueBand, type CueComponent } from "@/lib/cueScore";
import { CARD_CLASS } from "../DashboardCard";

// "Cue points" - a single 0–100 score for the quality of your trading,
// built from six components (win rate, profit factor, win/loss, drawdown,
// recovery, consistency). See src/lib/cueScore.ts for the transparent
// formula. Rendered as a hexagon radar of the six sub-scores with the
// overall score called out above it.

// Band → colours (literal hex so the radar fill is stable across themes).
const BAND_HEX: Record<ReturnType<typeof cueBand>, string> = {
  great: "#34d399", // emerald-400
  good: "#2dd4bf", // teal-400
  ok: "#fbbf24", // amber-400
  low: "#f87171", // red-400
};
const BAND_LABEL: Record<ReturnType<typeof cueBand>, string> = {
  great: "Excellent",
  good: "Solid",
  ok: "Developing",
  low: "Needs work",
};

// Short axis labels for the radar vertices.
const SHORT: Record<string, string> = {
  winRate: "Win %",
  profitFactor: "Profit",
  winLoss: "Win/Loss",
  drawdown: "Drawdown",
  recovery: "Recovery",
  consistency: "Consist.",
};

function CueRadar({
  components,
  color,
}: {
  components: CueComponent[];
  color: string;
}) {
  const cx = 130;
  const cy = 106;
  const maxR = 56;
  const n = components.length;

  const point = (i: number, level: number): [number, number] => {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180);
    return [cx + maxR * level * Math.cos(a), cy + maxR * level * Math.sin(a)];
  };
  const ring = (level: number) =>
    components.map((_, i) => point(i, level).join(",")).join(" ");
  const data = components
    .map((c, i) => point(i, Math.max(0.04, c.score / 100)).join(","))
    .join(" ");

  return (
    <svg
      viewBox="0 0 260 214"
      className="w-full max-w-[300px] mx-auto"
      role="img"
      aria-label="Cue points breakdown"
    >
      {/* Grid rings */}
      {[0.34, 0.67, 1].map((lvl) => (
        <polygon
          key={lvl}
          points={ring(lvl)}
          fill="none"
          className="stroke-white/10"
          strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {components.map((_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-white/10"
            strokeWidth="1"
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={data}
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {components.map((c, i) => {
        const [x, y] = point(i, Math.max(0.04, c.score / 100));
        return <circle key={c.key} cx={x} cy={y} r="2.3" fill={color} />;
      })}
      {/* Vertex labels: metric name + its raw value */}
      {components.map((c, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const lx = cx + maxR * 1.28 * cos;
        const ly = cy + maxR * 1.28 * sin;
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        return (
          <text
            key={c.key}
            x={lx}
            y={ly}
            textAnchor={anchor}
            className="fill-white/50"
            fontSize="7.5"
          >
            <tspan x={lx} dy={sin < -0.5 ? "-0.5em" : "-0.1em"}>
              {SHORT[c.key] ?? c.label}
            </tspan>
            <tspan
              x={lx}
              dy="1.15em"
              className="fill-white/85"
              fontSize="8.5"
              fontWeight="600"
            >
              {c.display}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

export default function DashboardCueScore({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const result = useMemo(() => computeCueScore(trades), [trades]);

  if (isLoading || !trades) return null;

  if (!result) {
    return (
      <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
        <h2 className="text-sm md:text-base font-semibold">Cue points</h2>
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          Close a few trades to build your score.
        </div>
      </section>
    );
  }

  const band = cueBand(result.score);
  const color = BAND_HEX[band];

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">Cue points</h2>
        <span className="text-[11px] md:text-xs text-white/45 tabular-nums">
          {result.trades} closed
        </span>
      </div>

      {/* Overall score */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-[34px] leading-none font-semibold tabular-nums"
          style={{ color }}
        >
          {result.score}
        </span>
        <span className="text-[12px] text-white/40">/ 100</span>
        <span className="ml-auto text-[12px] font-medium" style={{ color }}>
          {BAND_LABEL[band]}
        </span>
      </div>

      {/* Hexagon radar of the six spokes */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <CueRadar components={result.components} color={color} />
      </div>
    </section>
  );
}
