// Pure FIFO fill-matcher shared by the nightly Flex sync today and the
// real-time worker later (see docs/realtime-ibkr-sync.md). It knows
// nothing about CSV, HTTP, Mongo, or users - it takes normalized fills
// and returns trade drafts. Keeping it pure means both ingestion paths
// produce byte-identical trades and it can be unit-tested in isolation.

export type NormalizedFill = {
  symbol: string; // cleaned underlying, e.g. "SPY"
  option: "CALL" | "PUT";
  strike: number;
  expiry: Date;
  // Signed quantity: > 0 is a buy, < 0 is a sell. 0 is ignored.
  signedQty: number;
  price: number; // execution price per contract (per-share premium)
  time: Date; // execution time
  // FIFO realized P/L reported for this whole sell fill, when the broker
  // provides it (e.g. IBKR). Only meaningful on sells. When omitted, the
  // matcher derives P/L from the buy/sell prices instead.
  realizedPnl?: number;
  // Total commission + taxes for this whole fill, as a positive number.
  // Divided across matched portions per contract.
  fee: number;
  // IBKR TradeID / execId, if known. Used to build the stored
  // `ibkrTradeId` so re-imports dedupe.
  tradeId?: string;
};

// Mirrors the persisted Trade shape minus `userID` (a persistence
// concern attached by the caller). Optional fields are present only on
// closed trades, exactly as the original sync wrote them.
export type TradeDraft = {
  symbol: string;
  option: "CALL" | "PUT";
  strike: number;
  qty: number;
  contractPrice: number;
  dateBought: Date;
  expiryDate: Date;
  dateClosed?: Date;
  closingContractPrice?: number;
  profitLoss?: number;
  fees: number;
  status: "WIN" | "LOSS" | "OPEN";
  simulated: boolean;
  notes?: string;
  strategy?: string;
  favourite?: boolean;
  ibkrTradeId?: string;
};

// A buy waiting in the FIFO queue, carrying its still-unmatched quantity
// and its per-contract commission (derived once when enqueued).
type OpenLot = {
  fill: NormalizedFill;
  remainingQty: number;
  commissionPerContract: number;
};

// IBKR reports a single combined charge for a whole fill; we may split
// that fill across several matched round-trips, so we work per contract.
function commissionPerContract(fill: NormalizedFill): number {
  const qty = Math.abs(fill.signedQty);
  return qty > 0 ? fill.fee / qty : 0;
}

// Round to 4dp so a precise sum still looks clean once displayed.
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// Equity-option contract multiplier. Used to derive realized P/L from
// per-share prices when the broker doesn't report it directly. Matches
// the app's convention elsewhere (profitLoss = (close - open) * 100 * qty).
const CONTRACT_MULTIPLIER = 100;

function groupKey(f: NormalizedFill): string {
  return `${f.symbol}|${f.strike}|${f.expiry.getTime()}|${f.option}`;
}

// Match buys and sells FIFO within each contract, oldest first. Closed
// round-trips become WIN/LOSS drafts; any buy quantity left over becomes
// an OPEN draft. Sells with no matching buy are ignored (same as before:
// the original CSV sync simply had nothing in the queue to match).
export function matchFills(fills: NormalizedFill[]): TradeDraft[] {
  const sorted = [...fills].sort((a, b) => a.time.getTime() - b.time.getTime());

  const groups = new Map<string, NormalizedFill[]>();
  for (const f of sorted) {
    const key = groupKey(f);
    const arr = groups.get(key);
    if (arr) arr.push(f);
    else groups.set(key, [f]);
  }

  const drafts: TradeDraft[] = [];

  for (const rows of groups.values()) {
    const openQueue: OpenLot[] = [];

    for (const fill of rows) {
      const qty = Math.abs(fill.signedQty);

      if (fill.signedQty > 0) {
        openQueue.push({
          fill,
          remainingQty: qty,
          commissionPerContract: commissionPerContract(fill),
        });
        continue;
      }

      if (fill.signedQty < 0) {
        let remainingSell = qty;
        const sellCpc = commissionPerContract(fill);

        while (remainingSell > 0 && openQueue.length > 0) {
          const lot = openQueue[0];
          const matchQty = Math.min(lot.remainingQty, remainingSell);
          const buy = lot.fill;
          // Prefer the broker's reported realized P/L (IBKR); otherwise
          // derive it from the round-trip prices, gross of fees (which
          // are stored separately) to match the IBKR convention.
          const pnl =
            fill.realizedPnl !== undefined
              ? (fill.realizedPnl / qty) * matchQty
              : (fill.price - buy.price) * CONTRACT_MULTIPLIER * matchQty;
          const fees = round4((lot.commissionPerContract + sellCpc) * matchQty);

          drafts.push({
            symbol: buy.symbol,
            option: buy.option,
            strike: buy.strike,
            qty: matchQty,
            contractPrice: buy.price,
            dateBought: buy.time,
            expiryDate: buy.expiry,
            dateClosed: fill.time,
            closingContractPrice: fill.price,
            profitLoss: pnl,
            fees,
            status: pnl > 0 ? "WIN" : "LOSS",
            simulated: false,
            notes: "",
            strategy: "Other",
            favourite: false,
            // Match the original convention: keyed on the sell fill's id,
            // joined to the buy's. Only set when the sell has an id.
            ...(fill.tradeId && {
              ibkrTradeId: `${buy.tradeId}-${fill.tradeId}`,
            }),
          });

          lot.remainingQty -= matchQty;
          remainingSell -= matchQty;
          if (lot.remainingQty <= 0) openQueue.shift();
        }
      }
    }

    for (const lot of openQueue) {
      // Open trades carry only the buy-side commission; the sell-side
      // share is added when the closing fill arrives later.
      const fees = round4(lot.commissionPerContract * lot.remainingQty);
      const buy = lot.fill;

      drafts.push({
        symbol: buy.symbol,
        option: buy.option,
        strike: buy.strike,
        qty: lot.remainingQty,
        contractPrice: buy.price,
        dateBought: buy.time,
        expiryDate: buy.expiry,
        fees,
        status: "OPEN",
        simulated: false,
        ...(buy.tradeId && { ibkrTradeId: buy.tradeId }),
      });
    }
  }

  return drafts;
}
