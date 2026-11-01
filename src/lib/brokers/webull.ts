import Papa from "papaparse";
import type { NormalizedFill } from "@/lib/ibkr/match";
import type { BrokerAdapter } from "./types";
import {
  field,
  headerMap,
  num,
  parseDateSafe,
  parseOccSymbol,
  type Row,
} from "./csvHelpers";

// Webull adapter. The user exports their filled order history as CSV
// (App/Desktop → Orders → Export). Webull encodes each option as an
// OCC-style symbol (e.g. "AAPL240119C00150000"), so we parse the contract
// out of the symbol/name cell. Only filled option orders are imported;
// realized P/L is derived from the round-trip prices by the shared matcher.
//
// Column names vary between Webull's app and desktop exports, so lookups are
// alias-based and case-insensitive. Validate against a real export before
// relying on it.

function parseFills(content: string): NormalizedFill[] {
  const { data } = Papa.parse<Row>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const fills: NormalizedFill[] = [];

  for (const row of data) {
    const lower = headerMap(row);

    // Skip anything that isn't a real execution (canceled/pending/rejected).
    const status = field(row, lower, ["Status", "State"]).toUpperCase();
    if (
      status &&
      (status.includes("CANCEL") ||
        status.includes("PENDING") ||
        status.includes("REJECT") ||
        status.includes("EXPIRED") ||
        status.includes("FAILED"))
    ) {
      continue;
    }

    const sideRaw = field(row, lower, ["Side", "Action", "B/S"]).toUpperCase();
    const isBuy = sideRaw.startsWith("BUY") || sideRaw === "B";
    const isSell = sideRaw.startsWith("SELL") || sideRaw === "S";
    if (!isBuy && !isSell) continue;

    // The contract lives in the symbol / name cell as an OCC symbol.
    const occ =
      parseOccSymbol(field(row, lower, ["Symbol", "Ticker"])) ??
      parseOccSymbol(field(row, lower, ["Name", "Contract"]));
    if (!occ) continue; // not an option row (or unparseable)

    const qty = Math.abs(
      num(field(row, lower, ["Filled", "Filled Qty", "Total Qty", "Quantity", "Qty"])),
    );
    if (qty === 0) continue;

    const price = Math.abs(
      num(field(row, lower, ["Avg Price", "Filled Price", "Price"])),
    );
    const time =
      parseDateSafe(field(row, lower, ["Filled Time", "Placed Time", "Time", "Date"])) ??
      occ.expiry;

    const fee = Math.abs(num(field(row, lower, ["Fees", "Fee", "Commission"])));

    fills.push({
      symbol: occ.symbol,
      option: occ.option,
      strike: occ.strike,
      expiry: occ.expiry,
      signedQty: isBuy ? qty : -qty,
      price,
      time,
      fee,
      tradeId: field(row, lower, ["Order ID", "Order No", "Order"]) || undefined,
    });
  }

  return fills;
}

export const webullAdapter: BrokerAdapter = {
  id: "webull",
  label: "Webull",
  mode: "file",
  parseFills,
};
