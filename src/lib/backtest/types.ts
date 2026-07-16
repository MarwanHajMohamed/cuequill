// Rule-based backtesting on an underlying stock/ETF. Everything here is
// plain data so it can live in both the browser (the engine runs
// client-side for instant reruns) and be persisted to the account.

export type Bar = {
  date: string; // yyyy-mm-dd
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// An indicator reference — the left/right operand of a condition.
export type Indicator =
  | { kind: "price"; field: "open" | "high" | "low" | "close" }
  | { kind: "sma"; period: number }
  | { kind: "ema"; period: number }
  | { kind: "rsi"; period: number }
  | { kind: "value"; value: number };

export type Comparator =
  | "crossesAbove"
  | "crossesBelow"
  | "greaterThan"
  | "lessThan";

// A condition is either an indicator comparison ("SMA(50) crosses above
// SMA(200)") or a candlestick / price-action pattern ("first red candle
// after 3 green"). Legacy saved configs have no `type` and only
// left/op/right — those are treated as comparisons.
export type CompareCondition = {
  type?: "compare";
  left: Indicator;
  op: Comparator;
  right: Indicator;
};

export type PatternKind =
  | "redCandle"
  | "greenCandle"
  | "firstRedAfterGreen"
  | "firstGreenAfterRed"
  | "gapUp"
  | "gapDown"
  | "higherHigh"
  | "lowerLow"
  | "insideBar"
  | "newHigh"
  | "newLow";

export type PatternCondition = {
  type: "pattern";
  pattern: PatternKind;
  n?: number; // lookback / streak length where relevant
};

export type Condition = CompareCondition | PatternCondition;

export function isPattern(c: Condition): c is PatternCondition {
  return "pattern" in c;
}

export const PATTERN_META: Record<
  PatternKind,
  { label: string; hasN: boolean; nLabel?: string; text: (n: number) => string }
> = {
  redCandle: {
    label: "Red candle (close < open)",
    hasN: false,
    text: () => "a red candle",
  },
  greenCandle: {
    label: "Green candle (close > open)",
    hasN: false,
    text: () => "a green candle",
  },
  firstRedAfterGreen: {
    label: "First red candle after N green",
    hasN: true,
    nLabel: "green bars before",
    text: (n) => `the first red candle after ${n} green`,
  },
  firstGreenAfterRed: {
    label: "First green candle after N red",
    hasN: true,
    nLabel: "red bars before",
    text: (n) => `the first green candle after ${n} red`,
  },
  gapUp: {
    label: "Gap up (open > prev close)",
    hasN: false,
    text: () => "a gap up",
  },
  gapDown: {
    label: "Gap down (open < prev close)",
    hasN: false,
    text: () => "a gap down",
  },
  higherHigh: {
    label: "Higher high than prev bar",
    hasN: false,
    text: () => "a higher high",
  },
  lowerLow: {
    label: "Lower low than prev bar",
    hasN: false,
    text: () => "a lower low",
  },
  insideBar: {
    label: "Inside bar",
    hasN: false,
    text: () => "an inside bar",
  },
  newHigh: {
    label: "New N-day high (close)",
    hasN: true,
    nLabel: "lookback days",
    text: (n) => `a new ${n}-day closing high`,
  },
  newLow: {
    label: "New N-day low (close)",
    hasN: true,
    nLabel: "lookback days",
    text: (n) => `a new ${n}-day closing low`,
  },
};

export const DEFAULT_PATTERN_N: Partial<Record<PatternKind, number>> = {
  firstRedAfterGreen: 3,
  firstGreenAfterRed: 3,
  newHigh: 20,
  newLow: 20,
};

// Plain-English text for a single condition (used in the strategy recap).
export function conditionText(c: Condition): string {
  if (isPattern(c)) {
    const meta = PATTERN_META[c.pattern];
    return `there's ${meta.text(c.n ?? DEFAULT_PATTERN_N[c.pattern] ?? 1)}`;
  }
  return `${indicatorLabel(c.left)} ${COMPARATOR_LABEL[c.op]} ${indicatorLabel(c.right)}`;
}

export type BacktestConfig = {
  symbol: string;
  from: string; // yyyy-mm-dd (inclusive)
  to: string; // yyyy-mm-dd (inclusive)
  direction: "long" | "short";
  // Entry fires when EVERY entry condition is true on the same bar.
  entry: Condition[];
  // Exit fires when ANY exit condition is true (in addition to the
  // stop / target / time exits below).
  exit: Condition[];
  stopLossPct?: number | null; // e.g. 5 = exit if -5% from entry
  takeProfitPct?: number | null; // e.g. 10 = exit if +10% from entry
  maxBars?: number | null; // time stop: exit after N bars held
  initialCapital: number;
  positionPct: number; // % of current equity allocated per trade
};

export type BtTrade = {
  side: "long" | "short";
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  returnPct: number;
  barsHeld: number;
  exitReason: "signal" | "stop" | "target" | "time" | "end";
};

export type EquityPoint = { date: string; value: number };

export type BacktestStats = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number; // 0-100
  netPL: number;
  returnPct: number; // total return on initial capital
  profitFactor: number | null; // null = no losses
  maxDrawdownPct: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number; // avg pnl per trade
  exposurePct: number; // % of bars holding a position
  barCount: number;
};

export type BacktestResult = {
  trades: BtTrade[];
  equity: EquityPoint[];
  stats: BacktestStats;
};

// ── Defaults / metadata for the UI ────────────────────────────────────
export const COMPARATOR_LABEL: Record<Comparator, string> = {
  crossesAbove: "crosses above",
  crossesBelow: "crosses below",
  greaterThan: "is greater than",
  lessThan: "is less than",
};

export const DEFAULT_CONFIG: BacktestConfig = {
  symbol: "SPY",
  from: "2015-01-01",
  to: new Date().toISOString().split("T")[0],
  direction: "long",
  entry: [
    {
      left: { kind: "sma", period: 50 },
      op: "crossesAbove",
      right: { kind: "sma", period: 200 },
    },
  ],
  exit: [
    {
      left: { kind: "sma", period: 50 },
      op: "crossesBelow",
      right: { kind: "sma", period: 200 },
    },
  ],
  stopLossPct: null,
  takeProfitPct: null,
  maxBars: null,
  initialCapital: 10000,
  positionPct: 100,
};

export function indicatorLabel(ind: Indicator): string {
  switch (ind.kind) {
    case "price":
      return ind.field.charAt(0).toUpperCase() + ind.field.slice(1);
    case "sma":
      return `SMA(${ind.period})`;
    case "ema":
      return `EMA(${ind.period})`;
    case "rsi":
      return `RSI(${ind.period})`;
    case "value":
      return `${ind.value}`;
  }
}

// ── Ready-made strategies ─────────────────────────────────────────────
// Pick one to see exactly how a strategy is expressed, then tweak it.
const base = {
  from: "2015-01-01",
  to: new Date().toISOString().split("T")[0],
  initialCapital: 10000,
  positionPct: 100,
};

export const TEMPLATES: {
  name: string;
  description: string;
  config: BacktestConfig;
}[] = [
  {
    name: "First red candle (buy the dip)",
    description:
      "After a run of green candles, buy the first red candle; exit on the next green candle, a 3% stop, or 5 bars.",
    config: {
      ...base,
      symbol: "SPY",
      direction: "long",
      entry: [{ type: "pattern", pattern: "firstRedAfterGreen", n: 3 }],
      exit: [{ type: "pattern", pattern: "greenCandle" }],
      stopLossPct: 3,
      takeProfitPct: null,
      maxBars: 5,
    },
  },
  {
    name: "First red candle (short the reversal)",
    description:
      "Short the first red candle after a green run, betting on a pullback; cover on the next green candle or a 3% stop.",
    config: {
      ...base,
      symbol: "QQQ",
      direction: "short",
      entry: [{ type: "pattern", pattern: "firstRedAfterGreen", n: 3 }],
      exit: [{ type: "pattern", pattern: "greenCandle" }],
      stopLossPct: 3,
      takeProfitPct: null,
      maxBars: 5,
    },
  },
  {
    name: "SMA golden cross",
    description:
      "Classic trend follow: buy when the 50-day SMA crosses above the 200-day, exit when it crosses back below.",
    config: {
      ...base,
      symbol: "SPY",
      direction: "long",
      entry: [
        {
          left: { kind: "sma", period: 50 },
          op: "crossesAbove",
          right: { kind: "sma", period: 200 },
        },
      ],
      exit: [
        {
          left: { kind: "sma", period: 50 },
          op: "crossesBelow",
          right: { kind: "sma", period: 200 },
        },
      ],
      stopLossPct: null,
      takeProfitPct: null,
      maxBars: null,
    },
  },
  {
    name: "RSI oversold bounce",
    description:
      "Mean reversion: buy when RSI(14) drops below 30, sell when it recovers above 55.",
    config: {
      ...base,
      symbol: "AAPL",
      direction: "long",
      entry: [
        {
          left: { kind: "rsi", period: 14 },
          op: "lessThan",
          right: { kind: "value", value: 30 },
        },
      ],
      exit: [
        {
          left: { kind: "rsi", period: 14 },
          op: "greaterThan",
          right: { kind: "value", value: 55 },
        },
      ],
      stopLossPct: 8,
      takeProfitPct: null,
      maxBars: null,
    },
  },
  {
    name: "20-day breakout",
    description:
      "Momentum: buy a new 20-day closing high, exit on a new 10-day low or a 6% stop.",
    config: {
      ...base,
      symbol: "NVDA",
      direction: "long",
      entry: [{ type: "pattern", pattern: "newHigh", n: 20 }],
      exit: [{ type: "pattern", pattern: "newLow", n: 10 }],
      stopLossPct: 6,
      takeProfitPct: null,
      maxBars: null,
    },
  },
];
