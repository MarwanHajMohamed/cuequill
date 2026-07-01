import Papa from "papaparse";
import type { NormalizedFill } from "@/lib/ibkr/match";
import type { BrokerAdapter } from "./types";

// Tastytrade adapter. The user exports their "Transaction History" CSV
// from Tastytrade and uploads it; we map equity-option trade rows into
// broker-agnostic fills. Tastytrade doesn't report realized P/L per
// fill, so the shared matcher derives it from the round-trip prices.
//
// Parsing is deliberately tolerant: column names are matched
// case-insensitively against a list of aliases, and the per-share price
// is derived from the signed `Value` (total cash) ÷ (qty × multiplier),
// which avoids ambiguity in how "Average Price" is reported. Validate
// the exact headers against a real export before relying on it.

type Row = Record<string, string>;

// Case-insensitive lookup of the first present column among `names`.
function field(row: Row, lower: Map<string, string>, names: string[]): string {
  for (const n of names) {
    const key = lower.get(n.toLowerCase());
    if (key !== undefined && row[key] != null && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

function num(s: string): number {
  // Strip currency symbols, commas, and parentheses-as-negative.
  const cleaned = s.replace(/[$,]/g, "").trim();
  const paren = /^\((.*)\)$/.exec(cleaned);
  const n = parseFloat(paren ? `-${paren[1]}` : cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseOption(s: string): "CALL" | "PUT" | null {
  const v = s.trim().toUpperCase();
  if (v === "CALL" || v === "C") return "CALL";
  if (v === "PUT" || v === "P") return "PUT";
  return null;
}

function parseDateSafe(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseFills(content: string): NormalizedFill[] {
  const { data } = Papa.parse<Row>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const fills: NormalizedFill[] = [];

  for (const row of data) {
    // Build a case-insensitive header → actual-key map for this row.
    const lower = new Map<string, string>();
    for (const k of Object.keys(row)) lower.set(k.trim().toLowerCase(), k);

    const instrument = field(row, lower, [
      "Instrument Type",
      "Instrument-Type",
    ]).toLowerCase();
    // Options only — this app's Trade model is option-centric.
    if (instrument && !instrument.includes("option")) continue;

    const action = field(row, lower, ["Action"]).toUpperCase();
    const isBuy = action.startsWith("BUY");
    const isSell = action.startsWith("SELL");
    if (!isBuy && !isSell) continue; // skip money movement, etc.

    const option = parseOption(field(row, lower, ["Call or Put", "Call/Put"]));
    if (!option) continue;

    const qty = Math.abs(num(field(row, lower, ["Quantity", "Qty"])));
    if (qty === 0) continue;

    const strike = num(field(row, lower, ["Strike Price", "Strike"]));
    const expiry = parseDateSafe(
      field(row, lower, ["Expiration Date", "Expiration", "Exp Date"]),
    );
    const time = parseDateSafe(
      field(row, lower, ["Date", "Date/Time", "Time"]),
    );
    if (!expiry || !time) continue;

    const symbol =
      field(row, lower, ["Underlying Symbol", "Root Symbol"]) ||
      field(row, lower, ["Symbol"]).split(/\s+/)[0];
    if (!symbol) continue;

    const multiplier = Math.abs(num(field(row, lower, ["Multiplier"]))) || 100;
    const value = Math.abs(num(field(row, lower, ["Value", "Total"])));
    // Per-share premium. Prefer deriving from total Value (unambiguous);
    // fall back to the reported Average Price.
    const price =
      value > 0
        ? value / (qty * multiplier)
        : Math.abs(num(field(row, lower, ["Average Price", "Price"])));

    const fee =
      Math.round(
        (Math.abs(num(field(row, lower, ["Commissions", "Commission"]))) +
          Math.abs(num(field(row, lower, ["Fees", "Fee"])))) *
          10000,
      ) / 10000;

    fills.push({
      symbol: symbol.toUpperCase(),
      option,
      strike,
      expiry,
      signedQty: isBuy ? qty : -qty,
      price,
      time,
      fee,
      // No per-fill realized P/L from Tastytrade; matcher derives it.
      tradeId:
        field(row, lower, ["Order #", "Order", "Order Number"]) || undefined,
    });
  }

  return fills;
}

export const tastytradeAdapter: BrokerAdapter = {
  id: "tastytrade",
  label: "Tastytrade",
  mode: "file",
  parseFills,
};
