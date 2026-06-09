import React from "react";
import {
  StrategyChart,
  Candle,
  EntryMarker,
  TimeLabel,
  TrendLine,
} from "@/components/strategy-chart";

/**
 * Gap Floor Break (PUT).
 *
 * First session candle is green and sets a horizontal floor (drawn under
 * its low). Price holds above the floor through the morning, then after
 * 11am a red candle breaks below the floor → ENTRY.
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
  // 9:30am - first green candle (sets the floor with its LOW = y=190)
  { x: xs(0), open: 180, close: 150, high: 145, low: 190, kind: "bullish" },
  // Morning chop ABOVE the floor
  { x: xs(1), open: 150, close: 165, high: 142, low: 170, kind: "bearish" },
  { x: xs(2), open: 165, close: 145, high: 140, low: 172, kind: "bullish" },
  { x: xs(3), open: 145, close: 162, high: 138, low: 168, kind: "bearish" },
  { x: xs(4), open: 162, close: 148, high: 144, low: 170, kind: "bullish" },
  // 11:00am - breakdown begins
  { x: xs(5), open: 148, close: 178, high: 144, low: 184, kind: "bearish" },
  // Red breaks the floor → ENTRY
  { x: xs(6), open: 178, close: 208, high: 174, low: 214, kind: "bearish" },
  { x: xs(7), open: 208, close: 232, high: 204, low: 238, kind: "bearish" },
  { x: xs(8), open: 232, close: 252, high: 228, low: 258, kind: "bearish" },
];

export function GapFloorBreakSchematic() {
  const entry = CANDLES[6];
  return (
    <StrategyChart title="Schematic - Gap Floor Break" width={420}>
      {/* Floor line - horizontal at y=190 set by the first candle's low */}
      <TrendLine
        x1={xs(0)}
        y1={190}
        x2={xs(8) + 20}
        y2={190}
        color="#f3f4f6"
        dashed={false}
        strokeWidth={2}
      />
      <text
        x={xs(0) - 6}
        y={186}
        fontSize={9}
        fill="#f3f4f6"
        opacity={0.7}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={600}
        letterSpacing="0.05em"
      >
        FLOOR
      </text>
      {CANDLES.map((c) => (
        <Candle key={c.x} {...c} />
      ))}
      <TimeLabel x={xs(0)} text="9:30am" guide />
      <TimeLabel x={xs(5)} text="after 11am" guide />
      <EntryMarker x={entry.x} y={entry.close} side="PUT" />
    </StrategyChart>
  );
}
