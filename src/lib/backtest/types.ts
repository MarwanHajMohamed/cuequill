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

export type Condition = {
  left: Indicator;
  op: Comparator;
  right: Indicator;
};

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
