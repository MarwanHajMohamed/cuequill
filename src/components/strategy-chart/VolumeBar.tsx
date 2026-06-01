"use client";
import React from "react";
import { useStrategyPlayback } from "./StrategyChart";

/**
 * Volume bar — drawn from `baseY` upward (toward the chart top) to
 * represent volume magnitude. Tinted to match its candle (green/red).
 */
type Props = {
  x: number;
  baseY: number;
  height: number;
  kind: "bullish" | "bearish";
  width?: number;
};

export function VolumeBar({ x, baseY, height, kind, width = 12 }: Props) {
  const { progressX } = useStrategyPlayback();
  if (progressX < x - width / 2) return null;
  const color = kind === "bullish" ? "#22c55e" : "#ef4444";
  return (
    <rect
      x={x - width / 2}
      y={baseY - height}
      width={width}
      height={height}
      fill={color}
      fillOpacity={0.45}
      rx={1}
    />
  );
}
