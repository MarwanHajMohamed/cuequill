import React from "react";

type Props = {
  /** Top y of the band (smaller value). */
  y1: number;
  /** Bottom y (larger value). */
  y2: number;
  kind: "support" | "resistance";
  x1?: number;
  x2?: number;
  label?: string;
};

export function Zone({ y1, y2, kind, x1 = 0, x2 = 800, label }: Props) {
  const color = kind === "support" ? "#22c55e" : "#ef4444";
  return (
    <g>
      <rect
        x={x1}
        y={y1}
        width={x2 - x1}
        height={y2 - y1}
        fill={color}
        fillOpacity={0.1}
      />
      <line
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y1}
        stroke={color}
        strokeOpacity={0.4}
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <line
        x1={x1}
        x2={x2}
        y1={y2}
        y2={y2}
        stroke={color}
        strokeOpacity={0.4}
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      {label && (
        <text
          x={x1 + 6}
          y={y1 + 12}
          fontSize={9}
          fill={color}
          opacity={0.85}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight={600}
          letterSpacing="0.06em"
        >
          {label.toUpperCase()}
        </text>
      )}
    </g>
  );
}
