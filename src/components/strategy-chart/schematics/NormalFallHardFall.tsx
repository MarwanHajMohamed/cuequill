import React from "react";
import {
  StrategyChart,
  Candle,
  MALine,
  EntryMarker,
} from "@/components/strategy-chart";

/**
 * Schematic for "Normal Fall & Hard Fall" strategy.
 *
 * Two panels:
 *   Left  — Normal Fall: $400 → $395, shallow dip; a red wick brushes
 *           below the 40MA; bullish candle → ENTRY.
 *   Right — Hard Fall:   $400 → $390, deeper dip; a red BODY closes below
 *           the 40MA before the bullish candle → ENTRY.
 *
 * Both panels are uptrend setups; the 40MA rises gently across each chart
 * and acts as the "anchor" the fall reaches.
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

// ─────────────── NORMAL FALL ───────────────
// Uptrend bodies around y=150–190. 40MA rises from y=210 → y=185.
// Reds dip with wicks brushing/just crossing the 40MA, then green
// confirmation at candle 6 → ENTRY.
const NORMAL: C[] = [
  { x: xs(0), open: 210, close: 195, high: 188, low: 215, kind: "bullish" },
  { x: xs(1), open: 195, close: 178, high: 170, low: 200, kind: "bullish" },
  { x: xs(2), open: 178, close: 162, high: 156, low: 184, kind: "bullish" },
  { x: xs(3), open: 162, close: 148, high: 142, low: 168, kind: "bullish" },
  // Small fall (~5 chart units of body movement)
  { x: xs(4), open: 150, close: 168, high: 146, low: 172, kind: "bearish" },
  // Red wick brushes 40MA (40MA ~ y=195 at this x; wick low=204 just past)
  { x: xs(5), open: 170, close: 188, high: 166, low: 204, kind: "bearish" },
  // Green confirmation → ENTRY
  { x: xs(6), open: 188, close: 162, high: 156, low: 192, kind: "bullish" },
  // Continuation up
  { x: xs(7), open: 162, close: 140, high: 134, low: 166, kind: "bullish" },
  { x: xs(8), open: 140, close: 120, high: 114, low: 144, kind: "bullish" },
  { x: xs(9), open: 120, close: 100, high: 94, low: 124, kind: "bullish" },
  { x: xs(10), open: 100, close: 80, high: 74, low: 104, kind: "bullish" },
];

const NORMAL_MA40: Array<[number, number]> = [
  [xs(0), 215],
  [xs(2), 208],
  [xs(4), 200],
  [xs(5), 196],
  [xs(6), 192],
  [xs(8), 180],
  [xs(10) + 30, 170],
];

// ─────────────── HARD FALL ───────────────
// Same start but the dip is deeper: 3 reds drop further and the LAST
// red's body closes below the 40MA (not just the wick). Confirmation
// at candle 7 → ENTRY.
const HARD: C[] = [
  { x: xs(0), open: 210, close: 195, high: 188, low: 215, kind: "bullish" },
  { x: xs(1), open: 195, close: 178, high: 170, low: 200, kind: "bullish" },
  { x: xs(2), open: 178, close: 162, high: 156, low: 184, kind: "bullish" },
  { x: xs(3), open: 162, close: 148, high: 142, low: 168, kind: "bullish" },
  // Hard fall — three reds, deeper drop
  { x: xs(4), open: 150, close: 175, high: 146, low: 180, kind: "bearish" },
  { x: xs(5), open: 175, close: 200, high: 170, low: 205, kind: "bearish" },
  // Red body CLOSES below the 40MA (~y=200 at this x); close=218
  { x: xs(6), open: 200, close: 218, high: 196, low: 224, kind: "bearish" },
  // Green confirmation → ENTRY
  { x: xs(7), open: 218, close: 192, high: 186, low: 222, kind: "bullish" },
  // Continuation up
  { x: xs(8), open: 192, close: 165, high: 159, low: 196, kind: "bullish" },
  { x: xs(9), open: 165, close: 138, high: 132, low: 168, kind: "bullish" },
  { x: xs(10), open: 138, close: 110, high: 104, low: 142, kind: "bullish" },
];

const HARD_MA40: Array<[number, number]> = [
  [xs(0), 215],
  [xs(2), 210],
  [xs(4), 205],
  [xs(5), 202],
  [xs(6), 200],
  [xs(7), 198],
  [xs(9), 188],
  [xs(10) + 30, 175],
];

function Panel({
  title,
  candles,
  ma40,
  entryIdx,
}: {
  title: string;
  candles: C[];
  ma40: Array<[number, number]>;
  entryIdx: number;
}) {
  const entry = candles[entryIdx];
  return (
    <StrategyChart title={title} width={450}>
      <MALine period={40} points={ma40} />
      {candles.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <EntryMarker x={entry.x} y={entry.close} side="CALL" />
    </StrategyChart>
  );
}

export function NormalFallHardFallSchematic() {
  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="Normal Fall — wick brushes 40MA"
        candles={NORMAL}
        ma40={NORMAL_MA40}
        entryIdx={6}
      />
      <Panel
        title="Hard Fall — body closes below 40MA"
        candles={HARD}
        ma40={HARD_MA40}
        entryIdx={7}
      />
    </div>
  );
}
