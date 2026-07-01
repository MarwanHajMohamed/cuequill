// Validates the Tastytrade CSV parser + the shared matcher end to end,
// using a sample export. This is how a file-based broker is tested
// without an account. Run with: npm test

import test from "node:test";
import assert from "node:assert/strict";
import { tastytradeAdapter } from "./tastytrade.ts";
import { matchFills } from "../ibkr/match.ts";

const parse = tastytradeAdapter.parseFills!;

// A buy-to-open then sell-to-close on one SPY call, plus a stock row and
// a money-movement row that must be ignored.
const CSV = `Date,Type,Action,Symbol,Instrument Type,Value,Quantity,Average Price,Commissions,Fees,Multiplier,Underlying Symbol,Expiration Date,Strike Price,Call or Put,Order #
2026-01-02T10:00:00-0500,Trade,BUY_TO_OPEN,SPY   260116C00600000,Equity Option,-100.00,1,-1.00,-1.00,-0.14,100,SPY,1/16/26,600,CALL,1001
2026-01-02T11:00:00-0500,Trade,SELL_TO_CLOSE,SPY   260116C00600000,Equity Option,200.00,1,2.00,-1.00,-0.14,100,SPY,1/16/26,600,CALL,1002
2026-01-03T10:00:00-0500,Trade,BUY_TO_OPEN,AAPL,Equity,-19000.00,100,190.00,0.00,0.04,1,AAPL,,,, 1003
2026-01-04T10:00:00-0500,Money Movement,,,,,,,,,,,,,,`;

test("parses option fills and ignores stock / money-movement rows", () => {
  const fills = parse(CSV);
  assert.equal(fills.length, 2);

  const [buy, sell] = fills;
  assert.equal(buy.symbol, "SPY");
  assert.equal(buy.option, "CALL");
  assert.equal(buy.strike, 600);
  assert.equal(buy.signedQty, 1);
  assert.equal(buy.price, 1); // |−100| / (1 × 100)
  assert.equal(buy.fee, 1.14); // 1.00 commission + 0.14 fees

  assert.equal(sell.signedQty, -1);
  assert.equal(sell.price, 2); // |200| / (1 × 100)
  assert.equal(sell.realizedPnl, undefined); // Tastytrade doesn't report it
});

test("matcher derives a WIN from prices when realized P/L is absent", () => {
  const drafts = matchFills(parse(CSV));
  assert.equal(drafts.length, 1);

  const t = drafts[0];
  assert.equal(t.status, "WIN");
  assert.equal(t.contractPrice, 1);
  assert.equal(t.closingContractPrice, 2);
  assert.equal(t.profitLoss, 100); // (2 − 1) × 100 × 1
  assert.equal(t.fees, 2.28); // 1.14 buy + 1.14 sell
});
