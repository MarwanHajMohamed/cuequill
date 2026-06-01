"use client";
import React from "react";
import { useStrategyPlayback } from "./StrategyChart";

type Props = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
  label?: string;
  /**
   * Hold the line invisible until `progressX` reaches this value, then
   * animate it drawing in over `revealSpan` px of playback. Omit to render
   * statically with the rest of the chart.
   */
  revealAfterX?: number;
  /** How many px of playback the draw animation spans. Default 60. */
  revealSpan?: number;
};

export function TrendLine({
  x1,
  y1,
  x2,
  y2,
  color = "#94a3b8",
  dashed = true,
  strokeWidth = 1.5,
  label,
  revealAfterX,
  revealSpan = 60,
}: Props) {
  const { progressX } = useStrategyPlayback();

  let endX = x2;
  let endY = y2;
  let visible = true;

  if (revealAfterX !== undefined) {
    if (progressX < revealAfterX) {
      visible = false;
    } else {
      const t = Math.min(1, (progressX - revealAfterX) / revealSpan);
      endX = x1 + (x2 - x1) * t;
      endY = y1 + (y2 - y1) * t;
    }
  }

  if (!visible) return null;

  return (
    <g>
      <line
        x1={x1}
        x2={endX}
        y1={y1}
        y2={endY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "6 4" : undefined}
        strokeLinecap="round"
      />
      {label && endX === x2 && (
        <text
          x={x2 + 4}
          y={y2 + 4}
          fontSize={10}
          fill={color}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}
