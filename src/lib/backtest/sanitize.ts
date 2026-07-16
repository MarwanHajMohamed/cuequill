// Coerces loosely-shaped input (e.g. an LLM's JSON, or a legacy saved
// config) into a valid BacktestConfig. Never throws — anything it can't
// make sense of falls back to a sane default so the engine always gets a
// runnable config.

import {
  DEFAULT_CONFIG,
  DEFAULT_PATTERN_N,
  PATTERN_META,
  COMPARATOR_LABEL,
  type BacktestConfig,
  type Comparator,
  type Condition,
  type Indicator,
  type PatternKind,
} from "./types";

const PATTERN_KINDS = Object.keys(PATTERN_META) as PatternKind[];
const COMPARATORS = Object.keys(COMPARATOR_LABEL) as Comparator[];
const INDICATOR_KINDS = ["price", "sma", "ema", "rsi", "value"] as const;
const PRICE_FIELDS = ["open", "high", "low", "close"] as const;

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// yyyy-mm-dd, else the fallback.
function ymd(v: unknown, fallback: string): string {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
    return v.trim();
  }
  return fallback;
}

function sanitizeIndicator(raw: unknown, fallback: Indicator): Indicator {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kind = INDICATOR_KINDS.includes(r.kind as (typeof INDICATOR_KINDS)[number])
    ? (r.kind as (typeof INDICATOR_KINDS)[number])
    : null;
  if (!kind) return fallback;
  switch (kind) {
    case "price": {
      const field = PRICE_FIELDS.includes(
        r.field as (typeof PRICE_FIELDS)[number],
      )
        ? (r.field as (typeof PRICE_FIELDS)[number])
        : "close";
      return { kind: "price", field };
    }
    case "value":
      return { kind: "value", value: num(r.value, 0) };
    default: {
      const period = Math.max(1, Math.round(num(r.period, 14)));
      return { kind, period };
    }
  }
}

function sanitizeCondition(raw: unknown): Condition | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  // A pattern if it's tagged as one OR carries a recognised pattern name.
  const isPatternShape =
    r.type === "pattern" ||
    (r.type !== "compare" &&
      PATTERN_KINDS.includes(r.pattern as PatternKind));
  if (isPatternShape) {
    if (!PATTERN_KINDS.includes(r.pattern as PatternKind)) return null;
    const pattern = r.pattern as PatternKind;
    const cond: Condition = { type: "pattern", pattern };
    if (PATTERN_META[pattern].hasN) {
      cond.n = Math.max(
        1,
        Math.round(num(r.n, DEFAULT_PATTERN_N[pattern] ?? 1)),
      );
    }
    return cond;
  }
  // Otherwise a comparison.
  const op = COMPARATORS.includes(r.op as Comparator)
    ? (r.op as Comparator)
    : null;
  if (!op) return null;
  return {
    type: "compare",
    left: sanitizeIndicator(r.left, { kind: "price", field: "close" }),
    op,
    right: sanitizeIndicator(r.right, { kind: "sma", period: 50 }),
  };
}

function sanitizeConditions(raw: unknown): Condition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeCondition)
    .filter((c): c is Condition => c !== null);
}

export function sanitizeConfig(raw: unknown): BacktestConfig {
  const r = (raw ?? {}) as Record<string, unknown>;

  const symbol =
    typeof r.symbol === "string" && r.symbol.trim()
      ? r.symbol
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9.\-]/g, "")
      : DEFAULT_CONFIG.symbol;

  const direction = r.direction === "short" ? "short" : "long";

  const initialCapital = Math.max(1, num(r.initialCapital, DEFAULT_CONFIG.initialCapital));
  const positionPct = Math.min(100, Math.max(1, num(r.positionPct, 100)));

  return {
    symbol,
    from: ymd(r.from, DEFAULT_CONFIG.from),
    to: ymd(r.to, DEFAULT_CONFIG.to),
    direction,
    entry: sanitizeConditions(r.entry),
    exit: sanitizeConditions(r.exit),
    stopLossPct: optNum(r.stopLossPct),
    takeProfitPct: optNum(r.takeProfitPct),
    maxBars: (() => {
      const n = optNum(r.maxBars);
      return n == null ? null : Math.max(1, Math.round(n));
    })(),
    initialCapital,
    positionPct,
  };
}
