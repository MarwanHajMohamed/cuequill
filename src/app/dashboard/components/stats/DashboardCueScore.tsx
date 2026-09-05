"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { computeCueScore, cueBand, type CueComponent } from "@/lib/cueScore";
import { CARD_CLASS_BASE } from "../DashboardCard";

// "Cue points" - a single 0–100 score for the quality of your trading,
// built from six components (win rate, profit factor, win/loss, drawdown,
// recovery, consistency). See src/lib/cueScore.ts for the transparent
// formula. Rendered as a hexagon radar of the six sub-scores.
//
// Layout adapts to the tile: a narrow (1-col) tile stacks the score above
// the radar; a wide tile puts the score/labels on the left and gives the
// radar the full height on the right, so it stays large and readable.

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
  const cy = 104;
  const maxR = 58;
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
    // Tight viewBox (little margin around the hexagon + labels) and larger
    // fonts so the chart reads well even when scaled down into a short tile.
    <svg
      viewBox="18 14 224 188"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full max-h-full"
      role="img"
      aria-label="Cue points breakdown"
    >
      {[0.34, 0.67, 1].map((lvl) => (
        <polygon
          key={lvl}
          points={ring(lvl)}
          fill="none"
          className="stroke-white/10"
          strokeWidth="1"
        />
      ))}
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
      <polygon
        points={data}
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {components.map((c, i) => {
        const [x, y] = point(i, Math.max(0.04, c.score / 100));
        return <circle key={c.key} cx={x} cy={y} r="2.6" fill={color} />;
      })}
      {components.map((c, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const lx = cx + maxR * 1.3 * cos;
        const ly = cy + maxR * 1.3 * sin;
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        return (
          <text
            key={c.key}
            x={lx}
            y={ly}
            textAnchor={anchor}
            className="fill-white/55"
            fontSize="9.5"
          >
            <tspan x={lx} dy={sin < -0.5 ? "-0.55em" : "-0.1em"}>
              {SHORT[c.key] ?? c.label}
            </tspan>
            <tspan
              x={lx}
              dy="1.15em"
              className="fill-white/90"
              fontSize="10.5"
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

export default function DashboardCueScore({
  userId,
  rowSpan = 1,
}: {
  userId: string;
  // colSpan is accepted (passed by the registry) but the layout only keys
  // off height, so it's intentionally not destructured.
  colSpan?: number;
  rowSpan?: number;
}) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const result = useMemo(() => computeCueScore(trades), [trades]);

  if (isLoading || !trades) return null;

  if (!result) {
    return (
      <section className={`${CARD_CLASS_BASE} flex flex-col gap-3 h-full`}>
        <h2 className="text-sm md:text-base font-semibold">Cue points</h2>
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          Close a few trades to build your score.
        </div>
      </section>
    );
  }

  const band = cueBand(result.score);
  const color = BAND_HEX[band];

  // Single-row tiles (1×1 and 2×1) go side-by-side (score left, radar
  // right) so the hexagon gets the full row height instead of being
  // squished under the score. Taller tiles keep the stacked layout with
  // the hexagon centred below the score.
  const sideBySide = rowSpan === 1;

  // Stacked layout (all tiles bigger than 1×1): title row + score line with
  // the band on the right, hexagon centred below.
  const scoreBlock = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">Cue points</h2>
        <span className="text-[11px] md:text-xs text-white/45 tabular-nums">
          {result.trades} closed
        </span>
      </div>
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
    </>
  );

  if (sideBySide) {
    return (
      <section
        className={`${CARD_CLASS_BASE} h-full overflow-hidden flex flex-row items-stretch gap-3`}
      >
        {/* Left column: title + smaller score + band, with the closed-trade
            count pinned to the bottom-left. */}
        <div className="shrink-0 w-[42%] max-w-[180px] min-w-[110px] flex flex-col">
          <h2 className="text-sm font-semibold">Cue points</h2>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className="text-[24px] leading-none font-semibold tabular-nums"
              style={{ color }}
            >
              {result.score}
            </span>
            <span className="text-[11px] text-white/40">/ 100</span>
          </div>
          <span className="mt-0.5 text-[12px] font-medium" style={{ color }}>
            {BAND_LABEL[band]}
          </span>
          <span className="mt-auto text-[11px] text-white/45 tabular-nums">
            {result.trades} closed
          </span>
        </div>
        <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center">
          <CueRadar components={result.components} color={color} />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${CARD_CLASS_BASE} flex flex-col gap-3 h-full overflow-hidden`}
    >
      {scoreBlock}
      <div className="flex-1 min-h-[150px] lg:min-h-0 flex items-center justify-center">
        <CueRadar components={result.components} color={color} />
      </div>
    </section>
  );
}
