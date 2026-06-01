import React from "react";
import {
  StrategyChart,
  Candle,
  EntryMarker,
  TimeLabel,
} from "@/components/strategy-chart";

/**
 * Hanger in Daily (PUT).
 *
 * On a daily timeframe: a prior attempted uptrend, then a hanger candle
 * forms at 3:55–3:58pm (small body, LONG lower wick, near a recent high).
 * ENTRY at end of day — buy PUT.
 */

const STEP = 26;
const xs = (i: number) => 60 + i * STEP;

type C = {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  kind: "bullish" | "bearish" | "hanger";
};

const CANDLES: C[] = [
  // Recent context — attempted uptrend
  { x: xs(0), open: 230, close: 215, high: 212, low: 234, kind: "bullish" },
  { x: xs(1), open: 215, close: 195, high: 190, low: 220, kind: "bullish" },
  { x: xs(2), open: 195, close: 175, high: 170, low: 200, kind: "bullish" },
  { x: xs(3), open: 175, close: 158, high: 152, low: 180, kind: "bullish" },
  { x: xs(4), open: 158, close: 145, high: 140, low: 162, kind: "bullish" },
  // Doji-ish indecision at the top
  { x: xs(5), open: 145, close: 148, high: 138, low: 158, kind: "bearish" },
  { x: xs(6), open: 148, close: 142, high: 138, low: 155, kind: "bullish" },
  // Today's HANGER — long UPPER wick stretching far above the body; the
  // body sits at the BOTTOM of the candle's range. Red body (price spiked
  // up, got rejected, closed back down).
  { x: xs(7), open: 170, close: 180, high: 160, low: 184, kind: "hanger" },
];

export function HangerInDailySchematic() {
  const entry = CANDLES[7];
  return (
    <StrategyChart title="Schematic — Hanger in Daily" width={400}>
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <TimeLabel x={xs(7)} text="3:55pm" guide />
      <EntryMarker x={entry.x} y={entry.high} side="PUT" />
    </StrategyChart>
  );
}
