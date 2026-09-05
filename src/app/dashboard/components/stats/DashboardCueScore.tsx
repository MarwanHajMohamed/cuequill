"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { computeCueScore, cueBand, type CueComponent } from "@/lib/cueScore";
import { CARD_CLASS } from "../DashboardCard";

// "Cue points" - a single 0–100 score for the quality of your trading,
// built from six components (win rate, profit factor, win/loss, drawdown,
// recovery, consistency). See src/lib/cueScore.ts for the transparent
// formula. Rendered as a ring gauge plus a breakdown of the six sub-scores.

// Band → colours (literal hex so the SVG gauge is stable across themes).
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

function Gauge({ score }: { score: number }) {
  const band = cueBand(score);
  const color = BAND_HEX[band];
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;

  return (
    <div className="relative w-[110px] h-[110px] shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[30px] font-semibold tabular-nums leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-[10px] text-white/45 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function ComponentRow({ c }: { c: CueComponent }) {
  const color = BAND_HEX[cueBand(c.score)];
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[92px] shrink-0 text-[11px] text-white/55 truncate">
        {c.label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${c.score}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-[42px] shrink-0 text-right text-[11px] text-white/70 tabular-nums">
        {c.display}
      </span>
    </div>
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

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-4 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">Cue points</h2>
        <span className="text-[11px] md:text-xs text-white/45 tabular-nums">
          {result.trades} closed
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Gauge score={result.score} />
        <div className="min-w-0">
          <div
            className="text-[13px] font-medium"
            style={{ color: BAND_HEX[cueBand(result.score)] }}
          >
            {BAND_LABEL[cueBand(result.score)]}
          </div>
          <p className="mt-1 text-[11px] text-white/45 leading-relaxed">
            A single measure of trading quality - not just P/L. Built from the
            six factors below.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {result.components.map((c) => (
          <ComponentRow key={c.key} c={c} />
        ))}
      </div>
    </section>
  );
}
