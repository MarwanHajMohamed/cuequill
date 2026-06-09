import React from "react";
import {
  StrategyChart,
  Candle,
  EntryMarker,
  TrendLine,
  Zone,
} from "@/components/strategy-chart";

/**
 * Model of 4 Steps (PUT).
 *
 * Inside a bearish channel near the ceiling:
 *   1. A green tries to break out of the ceiling zone.
 *   2. A red "deletes" the green - closes back inside.
 *   3. A short mini-rally forms a small floor.
 *   4. A red breaks below the floor → ENTRY.
 */

const STEP = 22;
const xs = (i: number) => 60 + i * STEP;

type C = {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  kind: "bullish" | "bearish";
};

const CANDLES: C[] = [
  // Approaching the ceiling
  { x: xs(0), open: 200, close: 155, high: 130, low: 215, kind: "bullish" },
  { x: xs(1), open: 155, close: 135, high: 130, low: 205, kind: "bullish" },
  { x: xs(2), open: 135, close: 120, high: 115, low: 138, kind: "bullish" },
  // STEP 1 - green tries to break the ceiling zone
  { x: xs(3), open: 120, close: 96, high: 90, low: 124, kind: "bullish" },
  // STEP 2 - red "deletes" the green
  { x: xs(4), open: 96, close: 125, high: 92, low: 130, kind: "bearish" },
  { x: xs(5), open: 125, close: 145, high: 122, low: 150, kind: "bearish" },
  // STEP 3 - mini-rally creates a small floor at y=148
  { x: xs(6), open: 145, close: 130, high: 124, low: 150, kind: "bullish" },
  { x: xs(7), open: 130, close: 140, high: 126, low: 150, kind: "bearish" },
  // STEP 4 - red breaks the floor → ENTRY
  { x: xs(8), open: 140, close: 170, high: 138, low: 178, kind: "bearish" },
  // Continuation down
  { x: xs(9), open: 170, close: 198, high: 166, low: 204, kind: "bearish" },
  { x: xs(10), open: 198, close: 224, high: 194, low: 230, kind: "bearish" },
];

export function ModelOfFourStepsSchematic() {
  const entry = CANDLES[7];
  return (
    <StrategyChart title="Schematic - Model of 4 Steps" width={420}>
      {/* Ceiling zone (red translucent) */}
      <Zone y1={88} y2={108} kind="resistance" label="Ceiling" />
      {/* Mini-rally floor - short horizontal at y=150 */}
      <TrendLine
        x1={xs(0)}
        y1={218}
        x2={xs(7) - 6}
        y2={150}
        color="#f3f4f6"
        dashed={false}
        strokeWidth={2}
      />
      <text
        x={xs(2)}
        y={220}
        fontSize={9}
        fill="#f3f4f6"
        opacity={0.7}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={600}
        letterSpacing="0.05em"
      >
        MINI FLOOR
      </text>
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <EntryMarker x={entry.x} y={entry.close} side="PUT" />
    </StrategyChart>
  );
}
