"use client";
import React from "react";
import { useStrategyPlayback } from "./StrategyChart";

type Props = {
  /** Center x of the entry candle. */
  x: number;
  /** y of the candle's body - arrow will be placed just below for CALL, above for PUT. */
  y: number;
  side: "CALL" | "PUT";
  label?: string;
};

/**
 * Visual entry annotation: a bold arrow pointing at the entry candle plus
 * a colored pill ("BUY CALL" / "BUY PUT").
 */
export function EntryMarker({ x, y, side, label }: Props) {
  const { progressX } = useStrategyPlayback();
  // Only show once the playback cursor has reached the entry candle.
  if (progressX < x) return null;
  const isCall = side === "CALL";
  const color = isCall ? "#22c55e" : "#ef4444";
  const arrowOffset = 18;
  const badgeOffset = 44;

  // Arrow points UP toward candle for CALL (drawn below), DOWN for PUT.
  const arrowY = isCall ? y + arrowOffset : y - arrowOffset;
  const arrowTipY = isCall ? y + 4 : y - 4;
  const badgeY = isCall ? y + badgeOffset : y - badgeOffset - 16;
  const badgeText = label ?? `BUY ${side}`;
  const badgeWidth = badgeText.length * 6.5;

  return (
    <g>
      {/* Arrow shaft + head */}
      <line
        x1={x}
        x2={x}
        y1={arrowY}
        y2={arrowTipY}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <polygon
        points={
          isCall
            ? `${x - 5},${arrowTipY + 6} ${x + 5},${arrowTipY + 6} ${x},${arrowTipY}`
            : `${x - 5},${arrowTipY - 6} ${x + 5},${arrowTipY - 6} ${x},${arrowTipY}`
        }
        fill={color}
      />
      {/* Badge */}
      <g>
        <rect
          x={x - badgeWidth / 2}
          y={badgeY}
          width={badgeWidth}
          height={16}
          rx={3}
          fill={color}
        />
        <text
          x={x}
          y={badgeY + 11}
          fontSize={8}
          fontWeight={700}
          fill="#0F0F17"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          letterSpacing="0.05em"
        >
          {badgeText}
        </text>
      </g>
    </g>
  );
}
