// Per-strategy performance / leak-finder analytics. Pure and framework-free
// so it runs both in the browser (the strategy stats UI) and on the server
// (feeding Quill AI's context), guaranteeing the assistant's advice matches
// what the stats page shows.

import { tradeNetPL } from "@/lib/helpers/tradeNet";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The minimal trade shape the maths needs. Accepts both the client Trade
// (string dates) and a lean server trade (Date objects).
export type StratTradeLike = {
  status: "WIN" | "LOSS" | "OPEN";
  option?: "CALL" | "PUT" | null;
  symbol?: string | null;
  strategy?: string | null;
  dateBought?: string | Date | null;
  dateClosed?: string | Date | null;
  profitLoss?: number | null;
  fees?: number | null;
};

export type Slice = {
  key: string;
  label: string;
  dimension: string;
  n: number;
  wins: number;
  net: number;
  winRate: number;
};

export type EquityPoint = { i: number; value: number };

export type StrategyStats = {
  total: number;
  closedCount: number;
  openCount: number;
  wins: number;
  losses: number;
  winRate: number;
  netPL: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number | null;
  payoff: number | null;
  best: number;
  worst: number;
  avgHoldWin: number | null;
  avgHoldLoss: number | null;
  equity: EquityPoint[];
  zeroOffset: number;
  byDirection: Slice[];
  bySymbol: Slice[];
  byWeekday: Slice[];
  leak: Slice | undefined;
};

function ms(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

function buildSlices(
  closed: StratTradeLike[],
  keyer: (t: StratTradeLike) => string | null,
  dimension: string,
  labeler: (k: string) => string = (k) => k,
): Slice[] {
  const groups = new Map<string, StratTradeLike[]>();
  for (const t of closed) {
    const k = keyer(t);
    if (k == null) continue;
    const arr = groups.get(k) ?? [];
    arr.push(t);
    groups.set(k, arr);
  }
  return Array.from(groups.entries()).map(([k, ts]) => {
    const wins = ts.filter((t) => t.status === "WIN").length;
    const net = ts.reduce((s, t) => s + tradeNetPL(t), 0);
    return {
      key: k,
      label: labeler(k),
      dimension,
      n: ts.length,
      wins,
      net,
      winRate: ts.length ? (wins / ts.length) * 100 : 0,
    };
  });
}

export function computeStrategyStats(
  trades: StratTradeLike[],
  name: string,
): StrategyStats {
  const strat = trades.filter((t) => (t.strategy ?? "") === name);
  const closed = strat.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  );
  const open = strat.filter((t) => t.status === "OPEN");
  const wins = closed.filter((t) => t.status === "WIN");
  const losses = closed.filter((t) => t.status === "LOSS");

  const netPL = closed.reduce((s, t) => s + tradeNetPL(t), 0);
  const grossWin = wins.reduce((s, t) => s + tradeNetPL(t), 0);
  const grossLoss = -losses.reduce((s, t) => s + tradeNetPL(t), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = closed.length ? netPL / closed.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;
  const payoff = avgLoss > 0 ? avgWin / avgLoss : null;

  const holdDays = (t: StratTradeLike): number | null => {
    const a = ms(t.dateBought);
    const b = ms(t.dateClosed);
    if (a == null || b == null) return null;
    return Math.max(0, (b - a) / 86_400_000);
  };
  const avgHold = (ts: StratTradeLike[]) => {
    const ds = ts.map(holdDays).filter((d): d is number => d != null);
    return ds.length ? ds.reduce((s, d) => s + d, 0) / ds.length : null;
  };

  const sorted = [...closed].sort(
    (a, b) => (ms(a.dateClosed ?? a.dateBought) ?? 0) - (ms(b.dateClosed ?? b.dateBought) ?? 0),
  );
  let cum = 0;
  const equity = sorted.map((t, i) => {
    cum += tradeNetPL(t);
    return { i: i + 1, value: cum };
  });
  const eqVals = equity.map((e) => e.value);
  const eqMax = eqVals.length ? Math.max(...eqVals, 0) : 0;
  const eqMin = eqVals.length ? Math.min(...eqVals, 0) : 0;
  const zeroOffset =
    eqMax === eqMin ? 0.5 : Math.max(0, Math.min(1, eqMax / (eqMax - eqMin)));

  const byDirection = buildSlices(closed, (t) => t.option ?? null, "direction");
  const bySymbol = buildSlices(closed, (t) => t.symbol || null, "symbol");
  const byWeekday = buildSlices(
    closed,
    (t) => {
      const m = ms(t.dateClosed ?? t.dateBought);
      return m == null ? null : String(new Date(m).getDay());
    },
    "weekday",
    (k) => WEEKDAYS[Number(k)] ?? k,
  );

  const leak = [...byDirection, ...bySymbol, ...byWeekday]
    .filter((s) => s.n >= 2 && s.net < 0)
    .sort((a, b) => a.net - b.net)[0];

  return {
    total: strat.length,
    closedCount: closed.length,
    openCount: open.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    netPL,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    payoff,
    best: closed.length ? Math.max(...closed.map(tradeNetPL)) : 0,
    worst: closed.length ? Math.min(...closed.map(tradeNetPL)) : 0,
    avgHoldWin: avgHold(wins),
    avgHoldLoss: avgHold(losses),
    equity,
    zeroOffset,
    byDirection: byDirection.sort((a, b) => a.net - b.net),
    bySymbol: bySymbol.sort((a, b) => a.net - b.net),
    byWeekday,
    leak,
  };
}

// Compact plain-text performance summary for a strategy, for Quill's
// context. Returns "" when the strategy has no trades.
export function strategyStatsSummary(name: string, s: StrategyStats): string {
  if (s.total === 0) return "";
  const money = (n: number) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(0)}`;
  const parts: string[] = [
    `${s.total} used / ${s.closedCount} closed`,
    `win ${s.winRate.toFixed(0)}% (${s.wins}W/${s.losses}L)`,
    `net ${money(s.netPL)}`,
    `expectancy ${money(s.expectancy)}/trade`,
    `avg win ${money(s.avgWin)} vs avg loss ${money(-s.avgLoss)}`,
    `profit factor ${s.profitFactor == null ? "∞" : s.profitFactor.toFixed(2)}`,
    `payoff ${s.payoff == null ? "n/a" : s.payoff.toFixed(2) + "x"}`,
  ];
  if (s.avgHoldWin != null && s.avgHoldLoss != null) {
    parts.push(
      `avg hold win ${s.avgHoldWin.toFixed(1)}d vs loss ${s.avgHoldLoss.toFixed(1)}d`,
    );
  }
  if (s.leak) {
    parts.push(
      `biggest leak: ${s.leak.label} ${s.leak.dimension} (${s.leak.n} trades, ${s.leak.winRate.toFixed(0)}% win, ${money(s.leak.net)})`,
    );
  }
  return `    · ${name} performance — ${parts.join("; ")}.`;
}
