"use client";
import React from "react";
import { useStrategyPlayback } from "./StrategyChart";

/**
 * Moving-average line. Pass an array of [x, y] points and an MA period;
 * color is keyed off the period for cross-page consistency.
 *
 * Playback: the line draws progressively as `progressX` advances. The
 * label sticks to the visible endpoint.
 */
const MA_COLORS: Record<number, string> = {
  20: "#facc15",
  40: "#ef4444",
  100: "#a855f7",
  200: "#f3f4f6",
};

type Props = {
  period: 20 | 40 | 100 | 200;
  points: Array<[number, number]>;
  /** Render a small label at the right end of the line. */
  showLabel?: boolean;
  strokeWidth?: number;
};

/** Linearly interpolate the y on the polyline at the given x. */
function interpY(points: Array<[number, number]>, x: number): number {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0])
    return points[points.length - 1][1];
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i];
    if (px >= x) {
      const [qx, qy] = points[i - 1];
      const t = (x - qx) / (px - qx);
      return qy + t * (py - qy);
    }
  }
  return points[points.length - 1][1];
}

export function MALine({
  period,
  points,
  showLabel = true,
  strokeWidth = 2,
}: Props) {
  const { progressX } = useStrategyPlayback();
  if (points.length < 2) return null;
  const color = MA_COLORS[period];

  // Build the visible polyline: keep every point whose x ≤ progressX, then
  // append an interpolated endpoint at exactly progressX so the tip tracks
  // playback smoothly.
  const visible: Array<[number, number]> = [];
  for (const p of points) {
    if (p[0] <= progressX) visible.push(p);
    else break;
  }
  if (visible.length === 0) return null;
  const lastSourceX = visible[visible.length - 1][0];
  if (progressX > lastSourceX && progressX <= points[points.length - 1][0]) {
    visible.push([progressX, interpY(points, progressX)]);
  }
  if (visible.length < 2) return null;

  const d =
    `M ${visible[0][0]} ${visible[0][1]} ` +
    visible
      .slice(1)
      .map(([x, y], i, arr) => {
        const prev = i === 0 ? visible[0] : arr[i - 1];
        const cx = (prev[0] + x) / 2;
        const cy = (prev[1] + y) / 2;
        return `Q ${cx} ${cy} ${x} ${y}`;
      })
      .join(" ");

  const tip = visible[visible.length - 1];

  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} />
      {showLabel && (
        <g>
          <rect
            x={tip[0] + 6}
            y={tip[1] - 9}
            width={32}
            height={16}
            rx={3}
            fill={color}
            fillOpacity={0.15}
            stroke={color}
            strokeOpacity={0.6}
          />
          <text
            x={tip[0] + 22}
            y={tip[1] + 2}
            fontSize={10}
            fill={color}
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight={600}
          >
            {period}MA
          </text>
        </g>
      )}
    </g>
  );
}
