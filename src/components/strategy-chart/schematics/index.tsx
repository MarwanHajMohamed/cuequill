import React from "react";
import { MovingAverage40Schematic } from "./MovingAverage40";
import { NormalFallHardFallSchematic } from "./NormalFallHardFall";
import { BearishChannelBreakSchematic } from "./BearishChannelBreak";
import { NormalBullishGapSchematic } from "./NormalBullishGap";
import { BearishGapUptrendSchematic } from "./BearishGapUptrend";
import { HardFloorSchematic } from "./HardFloor";
import { FirstUptrendGapSchematic } from "./FirstUptrendGap";
import { FirstRedOpeningCandleSchematic } from "./FirstRedOpeningCandle";
import { GapFloorBreakSchematic } from "./GapFloorBreak";
import { ModelOfFourStepsSchematic } from "./ModelOfFourSteps";
import { HangerInDailySchematic } from "./HangerInDaily";

/**
 * Maps a strategy slug to its schematic component. Only strategies present
 * here render an illustration; others fall back to no schematic.
 */
const REGISTRY: Record<string, React.ComponentType> = {
  "moving-average-40": MovingAverage40Schematic,
  "normal-fall-and-hard-fall": NormalFallHardFallSchematic,
  "bearish-channel-break": BearishChannelBreakSchematic,
  "normal-bullish-gap": NormalBullishGapSchematic,
  "bearish-gap-uptrend": BearishGapUptrendSchematic,
  "hard-floor": HardFloorSchematic,
  "the-first-uptrend-gap": FirstUptrendGapSchematic,
  "first-red-opening-candle": FirstRedOpeningCandleSchematic,
  "gap-floor-break": GapFloorBreakSchematic,
  "Model-of-four-steps": ModelOfFourStepsSchematic,
  "hanger-in-daily": HangerInDailySchematic,
};

export function StrategySchematic({ slug }: { slug: string }) {
  const Component = REGISTRY[slug];
  if (!Component) return null;
  return <Component />;
}
