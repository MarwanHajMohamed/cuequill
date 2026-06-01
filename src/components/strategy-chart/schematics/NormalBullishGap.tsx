import React from "react";
import {
  StrategyChart,
  Candle,
  EntryMarker,
  TimeLabel,
} from "@/components/strategy-chart";

/**
 * Normal Bullish Gap (CALL).
 *
 * Day 1 closes at ~$100 (last green candle). Day 2 opens noticeably
 * higher at ~$103 — a visible vertical gap separates the two days.
 * The very first day-2 candle is the ENTRY.
 */

const STEP = 24;
const xs = (i: number) => 40 + i * STEP;

type C = {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  kind: "bullish" | "bearish";
};

// Day-1 close around y=180, day-2 open around y=130 (lower y = higher
// price — i.e., the gap UP).
const CANDLES: C[] = [
  // Day 1 — climbing greens, closes at $100
  { x: xs(0), open: 220, close: 205, high: 200, low: 224, kind: "bullish" },
  { x: xs(1), open: 205, close: 195, high: 192, low: 210, kind: "bullish" },
  { x: xs(2), open: 195, close: 185, high: 180, low: 200, kind: "bullish" },
  { x: xs(3), open: 185, close: 180, high: 176, low: 188, kind: "bullish" }, // $100 close
  // ── GAP ── (no candle at xs(4); leave x(4) for the visual break)
  // Day 2 — opens at $103 (y=130), continuation greens
  { x: xs(5), open: 130, close: 110, high: 105, low: 134, kind: "bullish" }, // ENTRY
  { x: xs(6), open: 110, close: 90, high: 85, low: 114, kind: "bullish" },
  { x: xs(7), open: 90, close: 70, high: 65, low: 94, kind: "bullish" },
  { x: xs(8), open: 70, close: 50, high: 44, low: 74, kind: "bullish" },
];

export function NormalBullishGapSchematic() {
  const entry = CANDLES[4]; // first day-2 candle
  const gapX = (xs(3) + xs(5)) / 2; // midpoint of the gap
  return (
    <StrategyChart title="Schematic — Normal Bullish Gap" width={400}>
      {/* Gap shading — translucent band between day-1 close and day-2 open */}
      <rect
        x={xs(3) + 12}
        y={130}
        width={xs(5) - xs(3) - 24}
        height={50}
        fill="#22c55e"
        fillOpacity={0.12}
      />
      <text
        x={gapX}
        y={158}
        fontSize={10}
        fill="#22c55e"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={600}
      >
        GAP
      </text>
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <TimeLabel x={xs(2)} text="Day 1" />
      <TimeLabel x={xs(6)} text="Day 2" />
      <EntryMarker x={entry.x} y={entry.close} side="CALL" />
    </StrategyChart>
  );
}
