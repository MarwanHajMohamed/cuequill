import Papa from "papaparse";
import type { NormalizedFill } from "@/lib/ibkr/match";
import type { BrokerAdapter } from "./types";
import {
  field,
  headerMap,
  num,
  parseDateSafe,
  parseOccSymbol,
  parseOption,
  type Row,
} from "./csvHelpers";

// Robinhood adapter. Robinhood's exported activity CSV lists option
// executions with a transaction code (BTO/STO/BTC/STC) and a human-readable
// description like "AAPL 1/19/2024 Call $150.00". We read the side from the
// trans code and the contract from the description (falling back to an OCC
// symbol when present).
//
// Robinhood's exports are inconsistent across account types, so parsing is
// alias-based and tolerant. Validate against a real export before relying on
// it.

// "AAPL 1/19/2024 Call $150.00" → contract parts.
function parseDescription(desc: string): {
  symbol: string;
  option: "CALL" | "PUT";
  strike: number;
  expiry: Date;
} | null {
  if (!desc) return null;
  const occ = parseOccSymbol(desc);
  if (occ) return occ;

  const upper = desc.trim();
  const cp = parseOption(/\b(call|put)\b/i.exec(upper)?.[1] ?? "");
  const strike = num((/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*$/.exec(upper)?.[1] ?? "") || "");
  const dateMatch = /(\d{1,2}\/\d{1,2}\/\d{2,4})/.exec(upper);
  const expiry = dateMatch ? parseDateSafe(dateMatch[1]) : null;
  const symbol = (upper.split(/\s+/)[0] ?? "").toUpperCase();
  if (!cp || !expiry || strike <= 0 || !symbol) return null;
  return { symbol, option: cp, strike, expiry };
}

function parseFills(content: string): NormalizedFill[] {
  const { data } = Papa.parse<Row>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const fills: NormalizedFill[] = [];

  for (const row of data) {
    const lower = headerMap(row);

    // Trans code drives the side. Options open/close both map to buy/sell.
    const code = field(row, lower, ["Trans Code", "Transaction Code", "Code"]).toUpperCase();
    const sideRaw = field(row, lower, ["Side", "Action"]).toUpperCase();
    const isBuy = code === "BTO" || code === "BTC" || sideRaw.startsWith("BUY");
    const isSell = code === "STO" || code === "STC" || sideRaw.startsWith("SELL");
    if (!isBuy && !isSell) continue;

    const contract =
      parseDescription(field(row, lower, ["Description", "Instrument", "Contract"])) ??
      parseOccSymbol(field(row, lower, ["Symbol", "Instrument"]));
    if (!contract) continue;

    const qty = Math.abs(num(field(row, lower, ["Quantity", "Qty"])));
    if (qty === 0) continue;

    // Robinhood prints the per-share option price; premium is per contract.
    const price = Math.abs(num(field(row, lower, ["Price"])));
    const time = parseDateSafe(
      field(row, lower, ["Activity Date", "Process Date", "Date"]),
    );
    if (!time) continue;

    const fee = Math.abs(num(field(row, lower, ["Fees", "Fee", "Commission"])));

    fills.push({
      symbol: contract.symbol,
      option: contract.option,
      strike: contract.strike,
      expiry: contract.expiry,
      signedQty: isBuy ? qty : -qty,
      price,
      time,
      fee,
    });
  }

  return fills;
}

export const robinhoodAdapter: BrokerAdapter = {
  id: "robinhood",
  label: "Robinhood",
  mode: "file",
  parseFills,
};
