import React from "react";
import {
  StrategyChart,
  Candle,
  MALine,
  EntryMarker,
  TrendLine,
} from "@/components/strategy-chart";

/**
 * Bearish Channel Break (CALL).
 *
 * Story: descending channel with the 40MA acting as a diagonal ceiling
 * above the 20MA. Price keeps rejecting off the ceiling. A green candle
 * finally closes above the ceiling line → ENTRY.
 */

const STEP = 20;
const xs = (i: number) => 60 + i * STEP;

type C = {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  kind: "bullish" | "bearish";
};

// Descending bodies — every red lower than the last.
const CANDLES: C[] = [
  { x: xs(0), open: 100, close: 130, high: 95, low: 135, kind: "bearish" },
  { x: xs(1), open: 130, close: 110, high: 105, low: 135, kind: "bullish" },
  { x: xs(2), open: 110, close: 140, high: 108, low: 145, kind: "bearish" },
  { x: xs(3), open: 140, close: 125, high: 122, low: 145, kind: "bullish" },
  { x: xs(4), open: 125, close: 155, high: 122, low: 160, kind: "bearish" },
  { x: xs(5), open: 155, close: 138, high: 135, low: 160, kind: "bullish" },
  { x: xs(6), open: 138, close: 170, high: 135, low: 175, kind: "bearish" },
  { x: xs(7), open: 170, close: 152, high: 148, low: 175, kind: "bullish" },
  { x: xs(8), open: 152, close: 184, high: 148, low: 190, kind: "bearish" },
  // Breakout candle — closes ABOVE the ceiling line → ENTRY
  { x: xs(9), open: 184, close: 130, high: 126, low: 188, kind: "bullish" },
  { x: xs(10), open: 130, close: 105, high: 100, low: 134, kind: "bullish" },
  { x: xs(11), open: 105, close: 80, high: 75, low: 110, kind: "bullish" },
];

// MAs slope downward alongside the channel; 40MA above 20MA (smaller y).
const MA40: Array<[number, number]> = [
  [xs(0), 90],
  [xs(3), 110],
  [xs(6), 130],
  [xs(9), 150],
  [xs(11) + 30, 165],
];
const MA20: Array<[number, number]> = [
  [xs(0), 115],
  [xs(3), 130],
  [xs(6), 150],
  [xs(9), 165],
  [xs(11) + 30, 175],
];

export function BearishChannelBreakSchematic() {
  const entry = CANDLES[9];
  return (
    <StrategyChart title="Schematic — Bearish Channel Break" width={450}>
      <MALine period={40} points={MA40} />
      <MALine period={20} points={MA20} />
      {/* Diagonal ceiling — connects the lower highs of the reds. Drawn
          statically so it's visible the whole time as the channel forms. */}
      <TrendLine
        x1={xs(0)}
        y1={100}
        x2={xs(8)}
        y2={150}
        color="#f3f4f6"
        dashed
        strokeWidth={2}
      />
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <EntryMarker x={entry.x} y={entry.close} side="CALL" />
    </StrategyChart>
  );
}
