import React from "react";
import {
  StrategyChart,
  Candle,
  MALine,
  EntryMarker,
  VolumeBar,
  Zone,
} from "@/components/strategy-chart";

/**
 * The First Uptrend Gap (CALL) — two-panel.
 *
 *   Daily: confirms we're in the hard-floor zone (price near 100/200MA).
 *   Hourly: first green candle after the fall + visibly LARGER volume
 *   bar on a solid/hammer candle → ENTRY.
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

const DAILY: C[] = [
  { x: xs(0), open: 100, close: 120, high: 95, low: 125, kind: "bearish" },
  { x: xs(1), open: 120, close: 145, high: 115, low: 150, kind: "bearish" },
  { x: xs(2), open: 145, close: 170, high: 140, low: 175, kind: "bearish" },
  { x: xs(3), open: 170, close: 200, high: 165, low: 215, kind: "bearish" },
  // In the floor zone
  { x: xs(4), open: 200, close: 215, high: 195, low: 232, kind: "bearish" },
  { x: xs(5), open: 215, close: 198, high: 192, low: 230, kind: "bullish" },
  { x: xs(6), open: 198, close: 175, high: 170, low: 205, kind: "bullish" },
  { x: xs(7), open: 175, close: 150, high: 144, low: 180, kind: "bullish" },
];

const D_MA100: Array<[number, number]> = [
  [xs(0), 175],
  [xs(3), 205],
  [xs(7) + 30, 210],
];
const D_MA200: Array<[number, number]> = [
  [xs(0), 200],
  [xs(3), 225],
  [xs(7) + 30, 228],
];

// Hourly — bottoming pattern with the FIRST big-volume bullish reversal.
const HOURLY: C[] = [
  { x: xs(0), open: 130, close: 150, high: 125, low: 155, kind: "bearish" },
  { x: xs(1), open: 150, close: 170, high: 145, low: 175, kind: "bearish" },
  { x: xs(2), open: 170, close: 190, high: 165, low: 198, kind: "bearish" },
  { x: xs(3), open: 190, close: 205, high: 184, low: 215, kind: "bearish" },
  // Hammer / first solid green — high volume → ENTRY
  { x: xs(4), open: 205, close: 175, high: 168, low: 218, kind: "bullish" },
  { x: xs(5), open: 175, close: 152, high: 146, low: 180, kind: "bullish" },
  { x: xs(6), open: 152, close: 125, high: 118, low: 156, kind: "bullish" },
  { x: xs(7), open: 125, close: 100, high: 94, low: 130, kind: "bullish" },
];

// Volume bars sit at the bottom of the chart. Most are small; the
// entry candle (idx 4) has a much taller bar.
const VOL_BASE_Y = 295;
const VOLUMES: Array<{ x: number; height: number; kind: "bullish" | "bearish" }> = [
  { x: xs(0), height: 12, kind: "bearish" },
  { x: xs(1), height: 14, kind: "bearish" },
  { x: xs(2), height: 16, kind: "bearish" },
  { x: xs(3), height: 18, kind: "bearish" },
  { x: xs(4), height: 42, kind: "bullish" }, // ← spike
  { x: xs(5), height: 22, kind: "bullish" },
  { x: xs(6), height: 18, kind: "bullish" },
  { x: xs(7), height: 14, kind: "bullish" },
];

export function FirstUptrendGapSchematic() {
  const dailyEntry = DAILY[5];
  const hourlyEntry = HOURLY[4];
  return (
    <div className="flex flex-col gap-3">
      <StrategyChart title="Daily — already in hard-floor zone" width={420}>
        <Zone y1={222} y2={240} kind="support" label="Hard floor" />
        <MALine period={200} points={D_MA200} />
        <MALine period={100} points={D_MA100} />
        {DAILY.map((c) => (
          <Candle key={c.x} {...c} />
        ))}
        <EntryMarker x={dailyEntry.x} y={dailyEntry.close} side="CALL" />
      </StrategyChart>
      <StrategyChart title="Hourly — first green + high volume spike" width={420}>
        {HOURLY.map((c) => (
          <Candle key={c.x} {...c} />
        ))}
        {VOLUMES.map((v) => (
          <VolumeBar key={v.x} {...v} baseY={VOL_BASE_Y} />
        ))}
        <EntryMarker x={hourlyEntry.x} y={hourlyEntry.close} side="CALL" />
      </StrategyChart>
    </div>
  );
}
