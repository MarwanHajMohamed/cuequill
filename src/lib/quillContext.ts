// Shared "what Quill knows about you" context builders. Turns the user's
// trades, rules, strategies, and goals into the plain-text snapshot that
// feeds both the chat assistant (/api/chat) and the dashboard insight
// (/api/dashboard/insight), so they always reason from the same source.

import mongoose from "mongoose";
import {
  computeMetric,
  goalProgress,
  METRIC_LABEL,
  TIMEFRAME_LABEL,
  metricUnit,
  type GoalMetric,
  type GoalTimeframe,
  type GoalDirection,
  type MetricTrade,
} from "@/lib/goals";

export type LeanTrade = {
  _id: mongoose.Types.ObjectId | string;
  symbol: string;
  option: "CALL" | "PUT";
  status: "OPEN" | "WIN" | "LOSS";
  profitLoss?: number;
  fees?: number;
  contractPrice: number;
  qty: number;
  strike: number;
  dateBought: Date;
  dateClosed?: Date;
  expiryDate: Date;
  closingContractPrice?: number;
  strategy?: string;
  notes?: string;
};

export type LeanRulesBoard = {
  sections?: { title?: string; rules?: { title?: string; body?: string }[] }[];
};
export type LeanStrategy = {
  name?: string;
  direction?: "CALL" | "PUT";
  timeframes?: string[];
  description?: string;
  tags?: string[];
};
export type LeanGoal = {
  kind: "metric" | "manual";
  title?: string;
  metric?: GoalMetric;
  target?: number;
  timeframe?: GoalTimeframe;
  direction?: GoalDirection;
  done?: boolean;
};

export function net(t: LeanTrade): number {
  return (t.profitLoss ?? 0) - (t.fees ?? 0);
}

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

export function buildTradeContext(trades: LeanTrade[]): string {
  if (trades.length === 0) {
    return "The trader has no trades yet.";
  }

  const closed = trades.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  );
  const open = trades.filter((t) => t.status === "OPEN");
  const totalNet = closed.reduce((s, t) => s + net(t), 0);
  const wins = closed.filter((t) => t.status === "WIN").length;
  const losses = closed.filter((t) => t.status === "LOSS").length;
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const avgWin = wins
    ? closed.filter((t) => t.status === "WIN").reduce((s, t) => s + net(t), 0) /
      wins
    : 0;
  const avgLoss = losses
    ? closed.filter((t) => t.status === "LOSS").reduce((s, t) => s + net(t), 0) /
      losses
    : 0;

  const byStrategy = groupBy(closed, (t) => t.strategy ?? "Other");
  const bySymbol = groupBy(closed, (t) => t.symbol);

  const fmtMoney = (n: number) =>
    `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
  const dateStr = (d: Date | string | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "-";

  const strategyRows = Object.entries(byStrategy)
    .map(([k, ts]) => {
      const n = ts.reduce((s, t) => s + net(t), 0);
      const w = ts.filter((t) => t.status === "WIN").length;
      return `  - ${k}: ${ts.length} closed, win ${((w / ts.length) * 100).toFixed(0)}%, net ${fmtMoney(n)}`;
    })
    .join("\n");

  const symbolRows = Object.entries(bySymbol)
    .map(([k, ts]) => {
      const n = ts.reduce((s, t) => s + net(t), 0);
      const w = ts.filter((t) => t.status === "WIN").length;
      return `  - ${k}: ${ts.length} closed, win ${((w / ts.length) * 100).toFixed(0)}%, net ${fmtMoney(n)}`;
    })
    .join("\n");

  // Buckets a closed trade on its exit date; an open trade on its
  // entry date - the same attribution rule the rest of the app uses.
  const bucketDay = (t: LeanTrade) => {
    const isClosed = t.status === "WIN" || t.status === "LOSS";
    const src = isClosed && t.dateClosed ? t.dateClosed : t.dateBought;
    return dateStr(src);
  };

  // ── Per-month and per-week aggregates ───────────────────────────────
  const monthly = new Map<
    string,
    { n: number; wins: number; losses: number; net: number }
  >();
  const weekly = new Map<
    string,
    { n: number; wins: number; losses: number; net: number; weekStart: string }
  >();
  for (const t of closed) {
    const day = bucketDay(t);
    const d = new Date(day + "T00:00:00Z");
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const m = monthly.get(monthKey) ?? { n: 0, wins: 0, losses: 0, net: 0 };
    m.n += 1;
    m.net += net(t);
    if (t.status === "WIN") m.wins += 1;
    else m.losses += 1;
    monthly.set(monthKey, m);

    // ISO-week (Mon-start). Compute via offsetting to nearest Monday.
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dow);
    const wKey = monday.toISOString().slice(0, 10);
    const w = weekly.get(wKey) ?? {
      n: 0,
      wins: 0,
      losses: 0,
      net: 0,
      weekStart: wKey,
    };
    w.n += 1;
    w.net += net(t);
    if (t.status === "WIN") w.wins += 1;
    else w.losses += 1;
    weekly.set(wKey, w);
  }

  const monthlyRows = Array.from(monthly.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, v]) => {
      const wr = v.n ? ((v.wins / v.n) * 100).toFixed(0) : "-";
      return `  - ${k}: ${v.n} closed (${v.wins}W/${v.losses}L), win ${wr}%, net ${fmtMoney(v.net)}`;
    })
    .join("\n");

  const weeklyRows = Array.from(weekly.values())
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .map((v) => {
      const wr = v.n ? ((v.wins / v.n) * 100).toFixed(0) : "-";
      return `  - week of ${v.weekStart}: ${v.n} closed (${v.wins}W/${v.losses}L), win ${wr}%, net ${fmtMoney(v.net)}`;
    })
    .join("\n");

  // ── Full trade list (compact, one line per trade) ───────────────────
  // Each row leads with [id:…] so edit_trade can target a specific trade
  // without ambiguity. Format:
  //   [id:…] entry → exit | symbol option strike xqty | entry$ → exit$
  //   | status | strategy | net
  const tradeRows = trades
    .map((t) => {
      const isClosed = t.status === "WIN" || t.status === "LOSS";
      const exitDate = isClosed ? dateStr(t.dateClosed) : "-";
      const exitPx = isClosed ? (t.closingContractPrice ?? "-") : "-";
      const netVal = isClosed ? fmtMoney(net(t)) : "OPEN";
      const id = String(t._id);
      return `  - [id:${id}] ${dateStr(t.dateBought)} → ${exitDate} | ${t.symbol} ${t.option} ${t.strike} x${t.qty} | $${t.contractPrice} → $${exitPx} | ${t.status} | ${t.strategy ?? "-"} | ${netVal}`;
    })
    .join("\n");

  return [
    `Snapshot from the most recent ${trades.length} trades (non-simulated):`,
    `- Closed: ${closed.length} (${wins} W / ${losses} L), Win rate ${winRate.toFixed(0)}%`,
    `- Net P/L (all closed in snapshot): ${fmtMoney(totalNet)}`,
    `- Avg winner: ${fmtMoney(avgWin)} · Avg loser: ${fmtMoney(avgLoss)}`,
    `- Currently open: ${open.length}`,
    "",
    "By strategy:",
    strategyRows || "  (none)",
    "",
    "By symbol:",
    symbolRows || "  (none)",
    "",
    "By month (closed trades, newest first):",
    monthlyRows || "  (none)",
    "",
    "By week (closed trades, Mon-start, newest first):",
    weeklyRows || "  (none)",
    "",
    `All ${trades.length} trades (entry → exit | symbol option strike qty | entry$ → exit$ | status | strategy | net):`,
    tradeRows,
  ].join("\n");
}

// Strip HTML tags + collapse whitespace so a rich-text strategy
// description becomes a compact plain-text line for the model.
function stripHtml(s: string | undefined, max = 240): string {
  if (!s) return "";
  const text = s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function buildRulesContext(board: LeanRulesBoard | null): string {
  const sections = board?.sections ?? [];
  const lines: string[] = [];
  for (const sec of sections) {
    const rules = sec.rules ?? [];
    if (rules.length === 0) continue;
    lines.push(`${sec.title || "Rules"}:`);
    for (const r of rules) {
      const body = r.body ? ` — ${stripHtml(r.body, 160)}` : "";
      lines.push(`  - ${r.title || "(untitled)"}${body}`);
    }
  }
  if (lines.length === 0) return "";
  return [
    "TRADING RULES (the user's own written rules — hold them to these):",
    ...lines,
  ].join("\n");
}

export function buildStrategiesContext(strategies: LeanStrategy[]): string {
  if (!strategies.length) return "";
  const rows = strategies.map((s) => {
    const tf = s.timeframes?.length ? ` [${s.timeframes.join(", ")}]` : "";
    const tags = s.tags?.length ? ` #${s.tags.join(" #")}` : "";
    const desc = stripHtml(s.description);
    return `  - ${s.name ?? "(unnamed)"} (${s.direction ?? "?"})${tf}${tags}${
      desc ? `: ${desc}` : ""
    }`;
  });
  return [
    "THE USER'S STRATEGIES (their documented setups — reference these by name):",
    ...rows,
  ].join("\n");
}

export function buildGoalsContext(
  goals: LeanGoal[],
  trades: LeanTrade[],
): string {
  if (!goals.length) return "";
  // Metric goals are computed against the same trades the snapshot uses.
  const metricTrades: MetricTrade[] = trades.map((t) => ({
    status: t.status,
    profitLoss: t.profitLoss ?? null,
    fees: t.fees ?? null,
    dateBought: new Date(t.dateBought).toISOString().slice(0, 10),
    dateClosed: t.dateClosed
      ? new Date(t.dateClosed).toISOString().slice(0, 10)
      : null,
  }));

  const fmt = (v: number | null, m: GoalMetric): string => {
    if (v == null) return "—";
    const unit = metricUnit(m);
    if (unit === "currency")
      return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;
    if (unit === "percent") return `${v.toFixed(0)}%`;
    if (unit === "ratio") return v.toFixed(2);
    return `${Math.round(v)}`;
  };

  const rows = goals.map((g) => {
    if (g.kind === "manual") {
      return `  - ${g.title || "(untitled)"}: ${g.done ? "done ✓" : "not done"}`;
    }
    const metric = g.metric ?? "net_pl";
    const tf = g.timeframe ?? "month";
    const dir = g.direction ?? "at_least";
    const current = computeMetric(metric, metricTrades, tf);
    const { achieved } = goalProgress(current, g.target ?? 0, dir);
    const targetStr = fmt(g.target ?? 0, metric);
    const currentStr = fmt(current, metric);
    const aim = dir === "at_least" ? "≥" : "≤";
    return `  - ${METRIC_LABEL[metric]} ${TIMEFRAME_LABEL[tf].toLowerCase()} ${aim} ${targetStr}: currently ${currentStr} (${
      achieved ? "on track ✓" : "not yet"
    })`;
  });
  return [
    "GOALS (the user's targets — track progress and call out where they stand):",
    ...rows,
  ].join("\n");
}

// Inject "today" reference + a calendar lookup for the next 14 days so
// Gemini doesn't have to guess what day "Friday" or "next Monday" is.
export function buildDateContext(tz: string): string {
  const now = new Date();
  const userToday = zonedYmd(now, tz);
  const userTodayDow = zonedWeekday(now, tz);
  const nyToday = zonedYmd(now, "America/New_York");
  const nyTodayDow = zonedWeekday(now, "America/New_York");

  const upcoming: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const ymd = zonedYmd(d, tz);
    const dow = zonedWeekday(d, tz);
    const label =
      i === 0
        ? "today"
        : i === 1
          ? "tomorrow"
          : i === 2
            ? "the day after tomorrow"
            : "";
    upcoming.push(`  - ${ymd} (${dow}${label ? `, ${label}` : ""})`);
  }

  return [
    `User's timezone: ${tz}`,
    `Today in user's timezone: ${userToday} (${userTodayDow})`,
    `Today in US/Eastern (market time): ${nyToday} (${nyTodayDow})`,
    "Upcoming dates (in the user's timezone):",
    ...upcoming,
  ].join("\n");
}

function zonedYmd(d: Date, tz: string): string {
  // en-CA returns YYYY-MM-DD format from Intl.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function zonedWeekday(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
  }).format(d);
}
