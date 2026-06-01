"use client";
import React from "react";
import { useStrategyPlayback } from "./StrategyChart";

export type CandleKind = "bullish" | "bearish" | "hammer" | "hanger" | "doji";

type Props = {
  /** Center x of the candle in chart coordinates. */
  x: number;
  /** y at the OPEN price (top of body for bullish, bottom for bearish). */
  open: number;
  /** y at the CLOSE price. */
  close: number;
  /** y at the HIGH price (smallest y value — top wick tip). */
  high: number;
  /** y at the LOW price (largest y value — bottom wick tip). */
  low: number;
  kind?: CandleKind;
  /** Width override; defaults to 14. */
  width?: number;
};

const COLORS = {
  bullish: "#22c55e",
  bearish: "#ef4444",
  hammer: "#22c55e", // bullish reversal
  hanger: "#ef4444", // bearish reversal
  doji: "#9ca3af",
};

export function Candle({
  x,
  open,
  close,
  high,
  low,
  kind = "bullish",
  width = 14,
}: Props) {
  const { progressX } = useStrategyPlayback();
  // Only render once the playback cursor has reached this candle's center.
  if (progressX < x - width / 2) return null;

  const color = COLORS[kind];
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);
  const bodyHeight = Math.max(2, bodyBottom - bodyTop);

  return (
    <g>
      {/* Wick */}
      <line
        x1={x}
        x2={x}
        y1={high}
        y2={low}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Body */}
      <rect
        x={x - width / 2}
        y={bodyTop}
        width={width}
        height={bodyHeight}
        fill={color}
        rx={1.5}
      />
    </g>
  );
}
