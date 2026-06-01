import React from "react";
import {
  StrategyChart,
  Candle,
  EntryMarker,
  TimeLabel,
  TrendLine,
} from "@/components/strategy-chart";

/**
 * Bearish Gap Uptrend (CALL).
 *
 * Stock opens premarket lower (a bearish gap). 9:30–10:00am two green
 * candles form inside the bearish channel. ENTRY on the 2nd green.
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
  // Premarket / prior-day reds — descending
  { x: xs(0), open: 90, close: 110, high: 85, low: 115, kind: "bearish" },
  { x: xs(1), open: 110, close: 130, high: 105, low: 135, kind: "bearish" },
  { x: xs(2), open: 130, close: 150, high: 125, low: 155, kind: "bearish" },
  // Gap-down open
  { x: xs(3), open: 175, close: 190, high: 170, low: 195, kind: "bearish" },
  // 9:30am — first green candle
  { x: xs(4), open: 190, close: 168, high: 162, low: 194, kind: "bullish" },
  // 10:00am — second green → ENTRY
  { x: xs(5), open: 168, close: 145, high: 138, low: 172, kind: "bullish" },
  // Continuation up
  { x: xs(6), open: 145, close: 122, high: 116, low: 148, kind: "bullish" },
  { x: xs(7), open: 122, close: 100, high: 95, low: 126, kind: "bullish" },
  { x: xs(8), open: 100, close: 78, high: 72, low: 104, kind: "bullish" },
];

export function BearishGapUptrendSchematic() {
  const entry = CANDLES[5];
  return (
    <StrategyChart title="Schematic — Bearish Gap Uptrend" width={400}>
      {/* Bearish channel ceiling — descending diagonal */}
      <TrendLine
        x1={xs(0)}
        y1={85}
        x2={xs(8)}
        y2={130}
        color="#f3f4f6"
        dashed
        strokeWidth={1.5}
      />
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <TimeLabel x={xs(4)} text="9:30am" guide />
      <TimeLabel x={xs(5)} text="10:00am" guide />
      <EntryMarker x={entry.x} y={entry.close} side="CALL" />
    </StrategyChart>
  );
}
