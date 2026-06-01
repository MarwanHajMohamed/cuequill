import React from "react";

type Props = {
  x: number;
  /** y position; defaults to near the bottom of the chart. */
  y?: number;
  text: string;
  /** Adds a faint vertical guide line up to the chart top. */
  guide?: boolean;
};

import { CHART_HEIGHT } from "./StrategyChart";

export function TimeLabel({ x, y = CHART_HEIGHT - 6, text, guide }: Props) {
  return (
    <g>
      {guide && (
        <line
          x1={x}
          x2={x}
          y1={0}
          y2={y - 14}
          stroke="#ffffff15"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      )}
      <text
        x={x}
        y={y}
        fontSize={10}
        fill="#94a3b8"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {text}
      </text>
    </g>
  );
}
