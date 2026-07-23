// Report builders for the /reports page. Pure and framework-free: each
// tabular report returns a { columns, rows } table the page can render on
// screen and, on demand, serialize to CSV via tableToCsv. Keeping the
// maths here (a) mirrors the numbers shown elsewhere in the app via
// tradeNetPL and (b) makes every report unit-testable without a browser.

import { format } from "date-fns";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import type { Trade } from "@/app/types/Trades";

const OPTION_MULTIPLIER = 100;

// A rendered report: column headers plus row cells in the same order.
export type ReportTable = {
  columns: string[];
  rows: (string | number)[][];
};

// ---- CSV plumbing --------------------------------------------------------

// Quote a single cell per RFC 4180: wrap in quotes when it contains a
// comma, quote, or newline, and double any embedded quotes.
function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Serialize a report table to CSV. Leading BOM so Excel opens UTF-8
// (notes/symbols) without mojibake.
export function tableToCsv(table: ReportTable): string {
  const lines = [table.columns, ...table.rows].map((r) =>
    r.map(csvCell).join(","),
  );
  return "﻿" + lines.join("\r\n");
}

// ---- shared helpers ------------------------------------------------------

// Stored dates are ISO timestamps; render the local calendar day. Empty
// string for missing/unparseable values so cells stay clean.
function ymd(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
}

// Notes are stored as HTML; flatten to single-line plain text so they
// survive a spreadsheet cell.
function plainNotes(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isClosed(t: Trade): boolean {
  return t.status === "WIN" || t.status === "LOSS";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(part: number, whole: number): number {
  return whole ? round2((part / whole) * 100) : 0;
}

// Holding period in whole days, or null when either leg is missing.
function holdDays(t: Trade): number | null {
  if (!t.dateBought || !t.dateClosed) return null;
  const a = new Date(t.dateBought).getTime();
  const b = new Date(t.dateClosed).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

// ---- reports -------------------------------------------------------------

// Every trade, every field — the "give me all my data" export.
export function allTradesTable(trades: Trade[]): ReportTable {
  const columns = [
    "Symbol", "Type", "Status", "Qty", "Strike",
    "Contract price", "Closing price",
    "Date bought", "Time entered", "Expiry",
    "Date closed", "Time exited",
    "Gross P/L", "Fees", "Net P/L",
    "Strategy", "Tags", "Simulated", "Notes",
  ];
  const rows = trades.map((t) => [
    t.symbol,
    t.option,
    t.status,
    t.qty,
    t.strike,
    t.contractPrice,
    t.closingContractPrice ?? "",
    ymd(t.dateBought),
    t.timeEntered ?? "",
    ymd(t.expiryDate),
    ymd(t.dateClosed),
    t.timeExited ?? "",
    isClosed(t) ? round2(t.profitLoss ?? 0) : "",
    t.fees ?? "",
    isClosed(t) ? round2(tradeNetPL(t)) : "",
    t.strategy ?? "",
    (t.tags ?? []).join("; "),
    t.simulated ? "yes" : "no",
    plainNotes(t.notes),
  ]);
  return { columns, rows };
}

// Schedule-D-style realized gains: proceeds vs cost basis per closed
// position, with a short/long term tag on the 365-day boundary.
export function taxReportTable(trades: Trade[]): ReportTable {
  const columns = [
    "Symbol", "Type", "Qty", "Strike",
    "Date acquired", "Date sold", "Term",
    "Proceeds", "Cost basis", "Fees", "Gain/Loss",
  ];
  const rows = trades
    .filter(isClosed)
    .sort((a, b) => ymd(a.dateClosed).localeCompare(ymd(b.dateClosed)))
    .map((t) => {
      const cost = round2(t.contractPrice * OPTION_MULTIPLIER * t.qty);
      const proceeds = round2(
        (t.closingContractPrice ?? 0) * OPTION_MULTIPLIER * t.qty,
      );
      const fees = t.fees ?? 0;
      const days = holdDays(t);
      const term = days == null ? "" : days > 365 ? "Long" : "Short";
      return [
        t.symbol,
        t.option,
        t.qty,
        t.strike,
        ymd(t.dateBought),
        ymd(t.dateClosed),
        term,
        proceeds,
        cost,
        fees,
        round2(proceeds - cost - fees),
      ];
    });
  return { columns, rows };
}

type Agg = { n: number; wins: number; losses: number; gross: number; fees: number };

function emptyAgg(): Agg {
  return { n: 0, wins: 0, losses: 0, gross: 0, fees: 0 };
}

function addTrade(a: Agg, t: Trade): void {
  a.n += 1;
  if (t.status === "WIN") a.wins += 1;
  if (t.status === "LOSS") a.losses += 1;
  a.gross += t.profitLoss ?? 0;
  a.fees += t.fees ?? 0;
}

function aggBy(
  trades: Trade[],
  keyer: (t: Trade) => string,
): Map<string, Agg> {
  const m = new Map<string, Agg>();
  for (const t of trades.filter(isClosed)) {
    const k = keyer(t);
    const a = m.get(k) ?? emptyAgg();
    addTrade(a, t);
    m.set(k, a);
  }
  return m;
}

function aggRow(a: Agg): (string | number)[] {
  const net = a.gross - a.fees;
  return [
    a.n,
    a.wins,
    a.losses,
    pct(a.wins, a.n),
    round2(a.gross),
    round2(a.fees),
    round2(net),
    a.n ? round2(net / a.n) : 0,
  ];
}

const AGG_TAIL = [
  "Trades", "Wins", "Losses", "Win rate",
  "Gross P/L", "Fees", "Net P/L", "Expectancy",
];

// Per calendar month (of the close date), ascending.
export function monthlyPerformanceTable(trades: Trade[]): ReportTable {
  const m = aggBy(trades, (t) => ymd(t.dateClosed).slice(0, 7) || "Unknown");
  const rows = Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, a]) => [month, ...aggRow(a)]);
  return { columns: ["Month", ...AGG_TAIL], rows };
}

// Per strategy, richest-first by net P/L.
export function strategyPerformanceTable(trades: Trade[]): ReportTable {
  const m = aggBy(trades, (t) => t.strategy || "Unassigned");
  const rows = Array.from(m.entries())
    .map(([name, a]) => ({ name, a, net: a.gross - a.fees }))
    .sort((x, y) => y.net - x.net)
    .map(({ name, a }) => [name, ...aggRow(a)]);
  return { columns: ["Strategy", ...AGG_TAIL], rows };
}

// Per underlying symbol, richest-first by net P/L.
export function symbolPerformanceTable(trades: Trade[]): ReportTable {
  const m = aggBy(trades, (t) => t.symbol || "—");
  const rows = Array.from(m.entries())
    .map(([sym, a]) => ({ sym, a, net: a.gross - a.fees }))
    .sort((x, y) => y.net - x.net)
    .map(({ sym, a }) => [sym, ...aggRow(a)]);
  return { columns: ["Symbol", ...AGG_TAIL], rows };
}

// Full raw backup — round-trips back into the app / another tool.
export function backupJson(trades: Trade[]): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), count: trades.length, trades },
    null,
    2,
  );
}
