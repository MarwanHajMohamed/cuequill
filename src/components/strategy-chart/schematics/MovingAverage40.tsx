import React from "react";
import {
  StrategyChart,
  Candle,
  MALine,
  EntryMarker,
  TrendLine,
} from "@/components/strategy-chart";

/**
 * Schematic for "Moving Average 40" strategy.
 *
 * Story the diagram tells (left → right):
 *   1. Prior uptrend (3 greens)
 *   2. Recent fall (5–6 reds)
 *   3. Fall reaches the 40MA, which holds as a floor
 *   4. Green confirmation candle → ENTRY
 *   5. Continuation greens
 *
 * 20MA sits above 40MA (the rule). Both MAs act as floors; price never
 * closes below the 40MA on the dip.
 */

// Tight horizontal spacing: candles every 26px starting at x=60.
const STEP = 20;
const x = (i: number) => 60 + i * STEP;

// Candle dataset: [index, open, close, high, low, kind]
const CANDLES: Array<{
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  kind: "bullish" | "bearish";
}> = [
  // Prior uptrend
  { x: x(0), open: 180, close: 150, high: 140, low: 190, kind: "bullish" },
  { x: x(1), open: 160, close: 135, high: 125, low: 170, kind: "bullish" },
  { x: x(2), open: 145, close: 120, high: 110, low: 155, kind: "bullish" },
  // Recent fall - series of reds dropping toward the 40MA
  { x: x(3), open: 125, close: 168, high: 120, low: 175, kind: "bearish" },
  { x: x(4), open: 170, close: 195, high: 162, low: 200, kind: "bearish" },
  { x: x(5), open: 185, close: 210, high: 178, low: 215, kind: "bearish" },
  { x: x(6), open: 205, close: 226, high: 200, low: 232, kind: "bearish" },
  { x: x(7), open: 222, close: 232, high: 218, low: 240, kind: "bearish" },
  // Touch of 40MA - wick pierces but body closes above
  { x: x(8), open: 232, close: 238, high: 226, low: 248, kind: "bearish" },
  { x: x(9), open: 238, close: 240, high: 232, low: 247, kind: "bearish" },
  // Confirmation green - ENTRY candle
  { x: x(10), open: 240, close: 214, high: 208, low: 244, kind: "bullish" },
  // Continuation
  { x: x(11), open: 214, close: 192, high: 186, low: 218, kind: "bullish" },
  { x: x(12), open: 192, close: 170, high: 162, low: 198, kind: "bullish" },
  { x: x(13), open: 170, close: 148, high: 140, low: 176, kind: "bullish" },
];

// MA point xs are spaced wider than candle xs so the line stays smooth;
// they're independent samples.
const MA20: Array<[number, number]> = [
  [x(0), 200],
  [x(2), 195],
  [x(4), 198],
  [x(6), 205],
  [x(8), 212],
  [x(10), 215],
  [x(12), 210],
  [x(13) + 30, 200],
];

const MA40: Array<[number, number]> = [
  [x(0), 232],
  [x(2), 234],
  [x(4), 236],
  [x(6), 240],
  [x(8), 244],
  [x(10), 244],
  [x(12), 240],
  [x(13) + 30, 234],
];

export function MovingAverage40Schematic() {
  const entry = CANDLES[10]; // confirmation candle
  const firstRed = CANDLES[3]; // first red of the fall
  const lastRed = CANDLES[9]; // last red before the green confirmation
  return (
    <StrategyChart title="Schematic - Moving Average 40" width={450}>
      <MALine period={40} points={MA40} />
      <MALine period={20} points={MA20} />
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      {/* Downtrend resistance: connects the top wicks of the first and last
          red candles. Draws in once the green confirmation forms. */}
      <TrendLine
        x1={firstRed.x}
        y1={firstRed.high}
        x2={lastRed.x}
        y2={lastRed.high}
        color="#f3f4f6"
        dashed={false}
        strokeWidth={2}
        revealAfterX={entry.x}
        revealSpan={80}
      />
      <EntryMarker x={entry.x} y={entry.close} side="CALL" />
    </StrategyChart>
  );
}
