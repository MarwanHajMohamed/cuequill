import React from "react";
import {
  StrategyChart,
  Candle,
  EntryMarker,
  TimeLabel,
  TrendLine,
} from "@/components/strategy-chart";

/**
 * First Red Opening Candle (PUT).
 *
 * Inside a bearish channel, the very first session candle (9:30–10:00am)
 * is red. ENTRY at 10:00am - buy PUT.
 */

const STEP = 24;
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
  // Prior-day context - descending reds (bearish channel)
  { x: xs(0), open: 60, close: 80, high: 55, low: 85, kind: "bearish" },
  { x: xs(1), open: 80, close: 100, high: 75, low: 105, kind: "bearish" },
  { x: xs(2), open: 100, close: 122, high: 95, low: 128, kind: "bearish" },
  // 9:30 - opening red
  { x: xs(3), open: 122, close: 158, high: 118, low: 164, kind: "bearish" },
  // 10:00 - ENTRY
  { x: xs(4), open: 158, close: 182, high: 152, low: 188, kind: "bearish" },
  // Continuation down
  { x: xs(5), open: 182, close: 205, high: 178, low: 210, kind: "bearish" },
  { x: xs(6), open: 205, close: 225, high: 200, low: 230, kind: "bearish" },
  { x: xs(7), open: 225, close: 248, high: 220, low: 254, kind: "bearish" },
];

export function FirstRedOpeningCandleSchematic() {
  const entry = CANDLES[4];
  return (
    <StrategyChart title="Schematic - First Red Opening Candle" width={400}>
      {/* Bearish channel - descending ceiling */}
      <TrendLine
        x1={xs(0)}
        y1={55}
        x2={xs(7)}
        y2={210}
        color="#f3f4f6"
        dashed={false}
        strokeWidth={1.5}
      />
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <TimeLabel x={xs(3)} text="9:30am" guide />
      <TimeLabel x={xs(4)} text="10:00am" guide />
      <EntryMarker x={entry.x} y={entry.close} side="PUT" />
    </StrategyChart>
  );
}
