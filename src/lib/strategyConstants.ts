// Side-effect-free constants shared between server (Mongoose model)
// and client (pages, hooks). Importing the Strategy model file from
// client code would pull all of Mongoose into the browser bundle and
// crash on first load because `mongoose.models` is undefined there.

export const FREE_STRATEGY_LIMIT = 3;

export const SEED_STRATEGIES: {
  name: string;
  direction: "CALL" | "PUT";
  timeframes: string[];
}[] = [
  { name: "Moving Average 40", direction: "CALL", timeframes: ["Hourly"] },
  { name: "Normal Fall & Hard Fall", direction: "CALL", timeframes: ["Daily"] },
  { name: "Bearish Channel Break", direction: "CALL", timeframes: ["Daily"] },
  { name: "Normal Bullish Gap", direction: "CALL", timeframes: ["Daily"] },
  { name: "Bearish Gap Uptrend", direction: "CALL", timeframes: ["Daily"] },
  { name: "Hard Floor", direction: "CALL", timeframes: ["Daily"] },
  { name: "The First Uptrend Gap", direction: "CALL", timeframes: ["Daily"] },
  {
    name: "First Red Opening Candle",
    direction: "PUT",
    timeframes: ["Hourly"],
  },
  { name: "Gap Floor Break", direction: "PUT", timeframes: ["Daily"] },
  { name: "Model of 4 Steps", direction: "PUT", timeframes: ["Daily"] },
  { name: "Hanger in Daily", direction: "PUT", timeframes: ["Daily"] },
];

// Element/kind types live here too so client components can import the
// shape without pulling in mongoose.
export type SchematicKind = "candle" | "line" | "arrow" | "zone" | "text";

export interface SchematicElement {
  id: string;
  kind: SchematicKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  bull?: boolean;
  // Candle wick lengths above (wickUp) and below (wickDown) the body.
  // Omitted falls back to a default so legacy candles still render.
  wickUp?: number;
  wickDown?: number;
  // Playback time (seconds) at which this element appears during the
  // animation. Omitted falls back to an auto left-to-right sequence.
  appearAt?: number;
  text?: string;
  color?: string;
  label?: string;
}

export interface Schematic {
  width: number;
  height: number;
  elements: SchematicElement[];
}
