import React from "react";
import {
  StrategyChart,
  Candle,
  MALine,
  EntryMarker,
  TrendLine,
  Zone,
} from "@/components/strategy-chart";

/**
 * Hard Floor (CALL) — two-panel.
 *
 *   Daily: price falls to and touches the 100MA / 200MA "hard floor".
 *   Hourly: a descending ceiling line is drawn on the fall. Post-11am a
 *   candle breaks above the ceiling → ENTRY.
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

// ── Daily panel — falling reds touching the 100MA/200MA zone ──
const DAILY: C[] = [
  { x: xs(0), open: 90, close: 105, high: 88, low: 110, kind: "bearish" },
  { x: xs(1), open: 105, close: 125, high: 100, low: 130, kind: "bearish" },
  { x: xs(2), open: 125, close: 150, high: 120, low: 155, kind: "bearish" },
  { x: xs(3), open: 150, close: 175, high: 145, low: 180, kind: "bearish" },
  { x: xs(4), open: 175, close: 200, high: 170, low: 215, kind: "bearish" },
  // Touches the floor zone (200MA)
  { x: xs(5), open: 200, close: 215, high: 195, low: 235, kind: "bearish" },
  { x: xs(6), open: 215, close: 198, high: 192, low: 232, kind: "bullish" },
  { x: xs(7), open: 198, close: 175, high: 170, low: 205, kind: "bullish" },
  { x: xs(8), open: 175, close: 152, high: 148, low: 180, kind: "bullish" },
];

const MA100: Array<[number, number]> = [
  [xs(0), 165],
  [xs(3), 195],
  [xs(6), 215],
  [xs(8) + 30, 220],
];
const MA200: Array<[number, number]> = [
  [xs(0), 195],
  [xs(3), 215],
  [xs(6), 230],
  [xs(8) + 30, 232],
];

// ── Hourly panel — descending ceiling, post-11am break ──
const HOURLY: C[] = [
  { x: xs(0), open: 110, close: 130, high: 105, low: 135, kind: "bearish" },
  { x: xs(1), open: 130, close: 150, high: 125, low: 155, kind: "bearish" },
  { x: xs(2), open: 150, close: 170, high: 145, low: 175, kind: "bearish" },
  { x: xs(3), open: 170, close: 188, high: 165, low: 192, kind: "bearish" },
  { x: xs(4), open: 188, close: 200, high: 184, low: 205, kind: "bearish" },
  // 11am — bullish reversal starts
  { x: xs(5), open: 200, close: 178, high: 172, low: 204, kind: "bullish" },
  // Break above the ceiling → ENTRY
  { x: xs(6), open: 178, close: 145, high: 140, low: 182, kind: "bullish" },
  { x: xs(7), open: 145, close: 120, high: 114, low: 148, kind: "bullish" },
  { x: xs(8), open: 120, close: 95, high: 90, low: 124, kind: "bullish" },
];

export function HardFloorSchematic() {
  const dailyEntry = DAILY[6];
  const hourlyEntry = HOURLY[6];
  return (
    <div className="flex flex-col gap-3">
      <StrategyChart title="Daily — touches 100MA / 200MA" width={450}>
        <Zone y1={220} y2={245} kind="support" label="Hard floor" />
        <MALine period={200} points={MA200} />
        <MALine period={100} points={MA100} />
        {DAILY.map((c) => (
          <Candle key={c.x} {...c} />
        ))}
        <EntryMarker x={dailyEntry.x} y={dailyEntry.close} side="CALL" />
      </StrategyChart>
      <StrategyChart title="Hourly — break of falling ceiling after 11am" width={450}>
        {/* Descending ceiling line drawn on the highs of the reds */}
        <TrendLine
          x1={xs(0)}
          y1={105}
          x2={xs(5)}
          y2={172}
          color="#f3f4f6"
          dashed={false}
          strokeWidth={2}
        />
        {HOURLY.map((c) => (
          <Candle key={c.x} {...c} />
        ))}
        <EntryMarker x={hourlyEntry.x} y={hourlyEntry.close} side="CALL" />
      </StrategyChart>
    </div>
  );
}
