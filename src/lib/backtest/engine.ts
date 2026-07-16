import { sma, ema, rsi } from "./indicators";
import { isPattern, DEFAULT_PATTERN_N } from "./types";
import type {
  Bar,
  BacktestConfig,
  BacktestResult,
  BtTrade,
  Condition,
  EquityPoint,
  Indicator,
  PatternCondition,
} from "./types";

// Candlestick / price-action pattern check at bar i. Returns null when
// there isn't enough history yet.
function evalPattern(
  bars: Bar[],
  p: PatternCondition,
  i: number,
): boolean | null {
  const n = p.n ?? DEFAULT_PATTERN_N[p.pattern] ?? 1;
  const b = bars[i];
  const red = (k: number) => bars[k].close < bars[k].open;
  const green = (k: number) => bars[k].close > bars[k].open;
  switch (p.pattern) {
    case "redCandle":
      return red(i);
    case "greenCandle":
      return green(i);
    case "firstRedAfterGreen": {
      if (i < n) return null;
      if (!red(i)) return false;
      for (let k = 1; k <= n; k++) if (!green(i - k)) return false;
      return true;
    }
    case "firstGreenAfterRed": {
      if (i < n) return null;
      if (!green(i)) return false;
      for (let k = 1; k <= n; k++) if (!red(i - k)) return false;
      return true;
    }
    case "gapUp":
      return i > 0 ? b.open > bars[i - 1].close : null;
    case "gapDown":
      return i > 0 ? b.open < bars[i - 1].close : null;
    case "higherHigh":
      return i > 0 ? b.high > bars[i - 1].high : null;
    case "lowerLow":
      return i > 0 ? b.low < bars[i - 1].low : null;
    case "insideBar":
      return i > 0
        ? b.high < bars[i - 1].high && b.low > bars[i - 1].low
        : null;
    case "newHigh": {
      if (i < n) return null;
      let mx = -Infinity;
      for (let k = i - n; k <= i - 1; k++) mx = Math.max(mx, bars[k].close);
      return b.close > mx;
    }
    case "newLow": {
      if (i < n) return null;
      let mn = Infinity;
      for (let k = i - n; k <= i - 1; k++) mn = Math.min(mn, bars[k].close);
      return b.close < mn;
    }
  }
}

// Deterministic key so each distinct indicator (e.g. SMA(50)) is computed
// once and reused across conditions.
function indKey(ind: Indicator): string {
  switch (ind.kind) {
    case "price":
      return `price:${ind.field}`;
    case "value":
      return `value:${ind.value}`;
    default:
      return `${ind.kind}:${ind.period}`;
  }
}

function buildSeries(bars: Bar[], ind: Indicator): (number | null)[] {
  const close = bars.map((b) => b.close);
  switch (ind.kind) {
    case "price":
      return bars.map((b) => b[ind.field]);
    case "value":
      return bars.map(() => ind.value);
    case "sma":
      return sma(close, ind.period);
    case "ema":
      return ema(close, ind.period);
    case "rsi":
      return rsi(close, ind.period);
  }
}

// Runs a rule-based backtest over daily bars. Signals are evaluated on a
// bar's close and filled at that same close (a common simplification for
// daily strategies). Stops/targets trigger intrabar against the bar's
// high/low.
export function runBacktest(
  allBars: Bar[],
  config: BacktestConfig,
): BacktestResult {
  const bars = allBars
    .filter((b) => b.date >= config.from && b.date <= config.to)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const empty: BacktestResult = {
    trades: [],
    equity: [],
    stats: {
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      netPL: 0,
      returnPct: 0,
      profitFactor: null,
      maxDrawdownPct: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      exposurePct: 0,
      barCount: bars.length,
    },
  };
  if (bars.length < 2) return empty;

  // Pre-compute every distinct indicator series once.
  const seriesCache = new Map<string, (number | null)[]>();
  const seriesFor = (ind: Indicator) => {
    const key = indKey(ind);
    let s = seriesCache.get(key);
    if (!s) {
      s = buildSeries(bars, ind);
      seriesCache.set(key, s);
    }
    return s;
  };
  for (const c of [...config.entry, ...config.exit]) {
    if (isPattern(c)) continue;
    seriesFor(c.left);
    seriesFor(c.right);
  }

  const evalCond = (c: Condition, i: number): boolean | null => {
    if (isPattern(c)) return evalPattern(bars, c, i);
    const l = seriesFor(c.left);
    const r = seriesFor(c.right);
    const li = l[i];
    const ri = r[i];
    if (li == null || ri == null) return null;
    if (c.op === "greaterThan") return li > ri;
    if (c.op === "lessThan") return li < ri;
    // Crosses need the previous bar too.
    if (i === 0) return null;
    const lp = l[i - 1];
    const rp = r[i - 1];
    if (lp == null || rp == null) return null;
    if (c.op === "crossesAbove") return lp <= rp && li > ri;
    return lp >= rp && li < ri; // crossesBelow
  };

  // Entry = all conditions true; exit = any condition true. An empty
  // condition list is treated as "never" (so an empty entry never fires).
  const entrySignal = (i: number) => {
    if (config.entry.length === 0) return false;
    for (const c of config.entry) {
      const v = evalCond(c, i);
      if (v !== true) return false;
    }
    return true;
  };
  const exitSignal = (i: number) => {
    for (const c of config.exit) if (evalCond(c, i) === true) return true;
    return false;
  };

  const sign = config.direction === "long" ? 1 : -1;
  let cashEquity = config.initialCapital;
  let inPos = false;
  let entryPrice = 0;
  let entryDate = "";
  let entryIdx = 0;
  let shares = 0;

  const trades: BtTrade[] = [];
  const equity: EquityPoint[] = [];
  let barsInPos = 0;

  const unrealized = (price: number) =>
    inPos ? shares * (price - entryPrice) * sign : 0;

  const closePosition = (
    i: number,
    exitPrice: number,
    reason: BtTrade["exitReason"],
  ) => {
    const pnl = shares * (exitPrice - entryPrice) * sign;
    cashEquity += pnl;
    trades.push({
      side: config.direction,
      entryDate,
      exitDate: bars[i].date,
      entryPrice,
      exitPrice,
      shares,
      pnl,
      returnPct:
        entryPrice > 0
          ? ((exitPrice - entryPrice) / entryPrice) * 100 * sign
          : 0,
      barsHeld: i - entryIdx,
      exitReason: reason,
    });
    inPos = false;
    shares = 0;
  };

  const sl = config.stopLossPct ?? null;
  const tp = config.takeProfitPct ?? null;
  const maxBars = config.maxBars ?? null;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    if (inPos) {
      barsInPos++;
      // Stop / target trigger intrabar.
      if (sl != null && sl > 0) {
        const stopPrice =
          sign === 1
            ? entryPrice * (1 - sl / 100)
            : entryPrice * (1 + sl / 100);
        const hit = sign === 1 ? bar.low <= stopPrice : bar.high >= stopPrice;
        if (hit) closePosition(i, stopPrice, "stop");
      }
      if (inPos && tp != null && tp > 0) {
        const targetPrice =
          sign === 1
            ? entryPrice * (1 + tp / 100)
            : entryPrice * (1 - tp / 100);
        const hit =
          sign === 1 ? bar.high >= targetPrice : bar.low <= targetPrice;
        if (hit) closePosition(i, targetPrice, "target");
      }
      if (inPos && maxBars != null && maxBars > 0 && i - entryIdx >= maxBars) {
        closePosition(i, bar.close, "time");
      }
      if (inPos && exitSignal(i)) {
        closePosition(i, bar.close, "signal");
      }
    }

    if (!inPos && entrySignal(i)) {
      const alloc = (cashEquity * config.positionPct) / 100;
      if (alloc > 0 && bar.close > 0) {
        shares = alloc / bar.close;
        entryPrice = bar.close;
        entryDate = bar.date;
        entryIdx = i;
        inPos = true;
      }
    }

    equity.push({ date: bar.date, value: cashEquity + unrealized(bar.close) });
  }

  // Close any open position at the last bar.
  if (inPos) closePosition(bars.length - 1, bars[bars.length - 1].close, "end");

  // ── Stats ──
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = -losses.reduce((s, t) => s + t.pnl, 0);
  const netPL = trades.reduce((s, t) => s + t.pnl, 0);

  let peak = equity.length ? equity[0].value : config.initialCapital;
  let maxDd = 0;
  for (const p of equity) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) maxDd = Math.max(maxDd, (peak - p.value) / peak);
  }

  return {
    trades,
    equity,
    stats: {
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      netPL,
      returnPct: config.initialCapital
        ? (netPL / config.initialCapital) * 100
        : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
      maxDrawdownPct: maxDd * 100,
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      expectancy: trades.length ? netPL / trades.length : 0,
      exposurePct: bars.length ? (barsInPos / bars.length) * 100 : 0,
      barCount: bars.length,
    },
  };
}
