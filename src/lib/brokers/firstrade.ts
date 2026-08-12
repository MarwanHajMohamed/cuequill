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

// Firstrade adapter. The user exports their account history CSV
// (Accounts → History → Export). Firstrade reports the contract either as an
// OCC symbol or across explicit Symbol/Strike/Expiry/Type columns, and the
// side via an Action/Buy-Sell column. Realized P/L is derived from the
// round-trip prices by the shared matcher.
//
// Column names are alias-based and case-insensitive; validate against a real
// export before relying on it.

function parseFills(content: string): NormalizedFill[] {
  const { data } = Papa.parse<Row>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const fills: NormalizedFill[] = [];

  for (const row of data) {
    const lower = headerMap(row);

    const action = field(row, lower, ["Action", "Side", "Buy/Sell", "Transaction"]).toUpperCase();
    const isBuy = action.includes("BUY") || action === "B" || action.includes("BTO");
    const isSell = action.includes("SELL") || action === "S" || action.includes("STC");
    if (!isBuy && !isSell) continue;

    // Prefer explicit contract columns; fall back to an OCC symbol / description.
    let symbol = field(row, lower, ["Underlying", "Underlying Symbol"]).toUpperCase();
    let option = parseOption(field(row, lower, ["Type", "Call/Put", "Put/Call", "Option Type"]));
    let strike = num(field(row, lower, ["Strike", "Strike Price"]));
    let expiry = parseDateSafe(field(row, lower, ["Expiration", "Expiry", "Exp Date", "Expiration Date"]));

    if (!option || !expiry || strike <= 0 || !symbol) {
      const occ =
        parseOccSymbol(field(row, lower, ["Symbol", "Ticker"])) ??
        parseOccSymbol(field(row, lower, ["Description", "Security"]));
      if (occ) {
        symbol = occ.symbol;
        option = occ.option;
        strike = occ.strike;
        expiry = occ.expiry;
      }
    }
    if (!symbol || !option || strike <= 0 || !expiry) continue;

    const qty = Math.abs(num(field(row, lower, ["Quantity", "Qty", "Shares"])));
    if (qty === 0) continue;

    const price = Math.abs(num(field(row, lower, ["Price", "Trade Price", "Avg Price"])));
    const time = parseDateSafe(
      field(row, lower, ["Trade Date", "Date", "TradeDate", "Transaction Date"]),
    );
    if (!time) continue;

    const fee = Math.abs(
      num(field(row, lower, ["Commission", "Commissions", "Fees", "Fee"])),
    );

    fills.push({
      symbol,
      option,
      strike,
      expiry,
      signedQty: isBuy ? qty : -qty,
      price,
      time,
      fee,
    });
  }

  return fills;
}

export const firstradeAdapter: BrokerAdapter = {
  id: "firstrade",
  label: "Firstrade",
  mode: "file",
  parseFills,
};
