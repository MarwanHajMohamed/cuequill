// Shared shapes + sanitisers for exporting / importing strategies as a
// portable JSON bundle. A bundle carries everything needed to recreate a
// strategy on another account: the drawing (schematic), the rich-text
// description, the labelled examples (with their inline images), plus the
// direction / timeframes / tags. No ids, ownership, or timestamps travel -
// import always mints fresh documents.

import type { Schematic, SchematicElement } from "@/lib/strategyConstants";
import type { StrategyExample, ExampleOutcome } from "@/lib/strategySeed";

export const STRATEGY_BUNDLE_TYPE = "cuequill.strategies";
export const STRATEGY_BUNDLE_VERSION = 1;

// One strategy, stripped to its portable fields.
export type ExportedStrategy = {
  name: string;
  direction: "CALL" | "PUT" | "BOTH";
  timeframes: string[];
  description: string;
  tags: string[];
  schematic: Schematic;
  examples: StrategyExample[];
};

export type StrategyBundle = {
  type: typeof STRATEGY_BUNDLE_TYPE;
  version: number;
  exportedAt: string;
  strategies: ExportedStrategy[];
};

// A loose superset of the fields we read off a stored doc when exporting.
type StrategyLike = {
  name?: unknown;
  direction?: unknown;
  timeframes?: unknown;
  description?: unknown;
  tags?: unknown;
  schematic?: unknown;
  examples?: unknown;
};

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];

const isElementKind = (
  k: unknown,
): k is SchematicElement["kind"] =>
  k === "candle" || k === "line" || k === "arrow" || k === "zone" || k === "text";

// Keep only well-formed schematic elements, coercing numeric fields. Unknown
// keys are dropped so an untrusted bundle can't smuggle extra paths through.
function sanitizeElements(v: unknown): SchematicElement[] {
  if (!Array.isArray(v)) return [];
  const out: SchematicElement[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    if (!isElementKind(e.kind)) continue;
    if (typeof e.x !== "number" || typeof e.y !== "number") continue;
    const el: SchematicElement = {
      id: typeof e.id === "string" ? e.id : "",
      kind: e.kind,
      x: e.x,
      y: e.y,
    };
    if (typeof e.w === "number") el.w = e.w;
    if (typeof e.h === "number") el.h = e.h;
    if (typeof e.x2 === "number") el.x2 = e.x2;
    if (typeof e.y2 === "number") el.y2 = e.y2;
    if (typeof e.wickUp === "number") el.wickUp = e.wickUp;
    if (typeof e.wickDown === "number") el.wickDown = e.wickDown;
    if (typeof e.appearAt === "number") el.appearAt = e.appearAt;
    if (typeof e.bull === "boolean") el.bull = e.bull;
    if (typeof e.text === "string") el.text = e.text;
    if (typeof e.color === "string") el.color = e.color;
    if (typeof e.label === "string") el.label = e.label;
    out.push(el);
  }
  return out;
}

function sanitizeSchematic(v: unknown): Schematic {
  const s = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    width: typeof s.width === "number" ? s.width : 800,
    height: typeof s.height === "number" ? s.height : 480,
    elements: sanitizeElements(s.elements),
  };
}

function sanitizeExamples(v: unknown): StrategyExample[] {
  if (!Array.isArray(v)) return [];
  const out: StrategyExample[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.src !== "string" || !e.src) continue;
    const outcome: ExampleOutcome =
      e.outcome === "Unsuccessful" ? "Unsuccessful" : "Successful";
    out.push({
      id: typeof e.id === "string" ? e.id : "",
      src: e.src,
      outcome,
      ...(typeof e.caption === "string" ? { caption: e.caption } : {}),
    });
  }
  return out;
}

// Project a stored strategy (or hook doc) down to its portable fields.
export function toExportedStrategy(s: StrategyLike): ExportedStrategy {
  return {
    name: String(s.name ?? "").trim() || "Untitled strategy",
    direction:
      s.direction === "PUT" ? "PUT" : s.direction === "BOTH" ? "BOTH" : "CALL",
    timeframes: asStringArray(s.timeframes),
    description: typeof s.description === "string" ? s.description : "",
    tags: asStringArray(s.tags),
    schematic: sanitizeSchematic(s.schematic),
    examples: sanitizeExamples(s.examples),
  };
}

export function buildBundle(strategies: StrategyLike[]): StrategyBundle {
  return {
    type: STRATEGY_BUNDLE_TYPE,
    version: STRATEGY_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    strategies: strategies.map(toExportedStrategy),
  };
}

// Parse an untrusted, JSON-decoded value into a clean list of strategies.
// Accepts either a full bundle, a bare array, or a single strategy object,
// so hand-edited or older files still import. Returns [] when nothing usable.
export function parseBundle(input: unknown): ExportedStrategy[] {
  let list: unknown;
  if (Array.isArray(input)) {
    list = input;
  } else if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    list = Array.isArray(obj.strategies) ? obj.strategies : [obj];
  } else {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && typeof s === "object")
    .map((s) => toExportedStrategy(s as StrategyLike))
    // A strategy with neither a drawing nor any content isn't worth importing.
    .filter(
      (s) =>
        s.schematic.elements.length > 0 ||
        s.description.trim() !== "" ||
        s.examples.length > 0,
    );
}

// Build a filesystem-friendly filename for a downloaded bundle.
export function bundleFilename(single?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = single
    ? single.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
    : "strategies";
  return `cuequill-${base || "strategy"}-${date}.json`;
}
