// Parity tests for the FIFO matcher extracted from the Flex sync.
// Run with: npm test  (Node 22 strips the types and runs node:test).

import test from "node:test";
import assert from "node:assert/strict";
import { matchFills, type NormalizedFill } from "./match.ts";

const EXPIRY = new Date(2026, 0, 16); // shared contract expiry

// Builds a fill with sensible defaults so each test only states what
// matters to it.
function fill(over: Partial<NormalizedFill> & { signedQty: number }): NormalizedFill {
  return {
    symbol: "SPY",
    option: "CALL",
    strike: 600,
    expiry: EXPIRY,
    price: 1,
    time: new Date("2026-01-02T15:00:00Z"),
    realizedPnl: 0,
    fee: 0,
    ...over,
  };
}

test("a buy fully closed by a sell becomes one WIN", () => {
  const drafts = matchFills([
    fill({ signedQty: 1, price: 1, fee: 1.3, time: new Date("2026-01-02T15:00:00Z"), tradeId: "B" }),
    fill({ signedQty: -1, price: 2, fee: 1.3, realizedPnl: 100, time: new Date("2026-01-02T16:00:00Z"), tradeId: "S" }),
  ]);

  assert.equal(drafts.length, 1);
  const t = drafts[0];
  assert.equal(t.status, "WIN");
  assert.equal(t.qty, 1);
  assert.equal(t.contractPrice, 1);
  assert.equal(t.closingContractPrice, 2);
  assert.equal(t.profitLoss, 100);
  assert.equal(t.fees, 2.6); // buy cpc 1.3 + sell cpc 1.3
  assert.equal(t.ibkrTradeId, "B-S");
  assert.equal(t.simulated, false);
  assert.equal(t.strategy, "Other");
});

test("a negative realized P/L closes as a LOSS", () => {
  const drafts = matchFills([
    fill({ signedQty: 2, price: 3, time: new Date("2026-01-02T15:00:00Z") }),
    fill({ signedQty: -2, price: 1, realizedPnl: -400, time: new Date("2026-01-02T16:00:00Z") }),
  ]);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].status, "LOSS");
  assert.equal(drafts[0].profitLoss, -400);
});

test("a buy with no closing sell becomes one OPEN with only buy-side fees", () => {
  const drafts = matchFills([
    fill({ signedQty: 3, price: 1.2, fee: 3, time: new Date("2026-01-02T15:00:00Z"), tradeId: "B" }),
  ]);
  assert.equal(drafts.length, 1);
  const t = drafts[0];
  assert.equal(t.status, "OPEN");
  assert.equal(t.qty, 3);
  assert.equal(t.fees, 3); // cpc 1.0 * 3
  assert.equal(t.dateClosed, undefined);
  assert.equal(t.profitLoss, undefined);
  assert.equal(t.ibkrTradeId, "B");
  // Open trades intentionally omit the closed-only defaults.
  assert.equal(t.strategy, undefined);
  assert.equal(t.notes, undefined);
});

test("FIFO matches a sell across two buys and leaves the remainder OPEN", () => {
  const drafts = matchFills([
    fill({ signedQty: 5, price: 1, fee: 5, time: new Date("2026-01-02T15:00:00Z"), tradeId: "A" }),
    fill({ signedQty: 5, price: 2, fee: 10, time: new Date("2026-01-02T15:30:00Z"), tradeId: "B" }),
    fill({ signedQty: -8, price: 3, fee: 8, realizedPnl: 800, time: new Date("2026-01-02T16:00:00Z"), tradeId: "S" }),
  ]);

  assert.equal(drafts.length, 3);

  const [first, second, open] = drafts;
  // First closed: 5 from buy A.
  assert.equal(first.qty, 5);
  assert.equal(first.contractPrice, 1);
  assert.equal(first.profitLoss, 500); // 800/8 * 5
  assert.equal(first.fees, 10); // (1.0 + 1.0) * 5
  assert.equal(first.ibkrTradeId, "A-S");
  // Second closed: 3 from buy B.
  assert.equal(second.qty, 3);
  assert.equal(second.contractPrice, 2);
  assert.equal(second.profitLoss, 300); // 800/8 * 3
  assert.equal(second.fees, 9); // (2.0 + 1.0) * 3
  assert.equal(second.ibkrTradeId, "B-S");
  // Remaining 2 of buy B stays open.
  assert.equal(open.status, "OPEN");
  assert.equal(open.qty, 2);
  assert.equal(open.contractPrice, 2);
  assert.equal(open.fees, 4); // 2.0 * 2
  assert.equal(open.ibkrTradeId, "B");
});

test("fills are matched in time order even if supplied out of order", () => {
  const drafts = matchFills([
    // Sell listed first, but it happened after the buy.
    fill({ signedQty: -1, price: 2, realizedPnl: 50, time: new Date("2026-01-02T16:00:00Z") }),
    fill({ signedQty: 1, price: 1, time: new Date("2026-01-02T15:00:00Z") }),
  ]);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].status, "WIN");
  assert.equal(drafts[0].profitLoss, 50);
});

test("a sell with no matching buy is ignored", () => {
  const drafts = matchFills([
    fill({ signedQty: -1, price: 2, realizedPnl: 50, time: new Date("2026-01-02T16:00:00Z") }),
  ]);
  assert.deepEqual(drafts, []);
});

test("different contracts are matched independently", () => {
  const drafts = matchFills([
    fill({ symbol: "SPY", strike: 600, signedQty: 1, time: new Date("2026-01-02T15:00:00Z") }),
    fill({ symbol: "QQQ", strike: 500, signedQty: 1, time: new Date("2026-01-02T15:00:00Z") }),
    fill({ symbol: "SPY", strike: 600, signedQty: -1, realizedPnl: 10, time: new Date("2026-01-02T16:00:00Z") }),
  ]);
  // SPY round-trips (closed); QQQ stays open.
  assert.equal(drafts.length, 2);
  const spy = drafts.find((d) => d.symbol === "SPY");
  const qqq = drafts.find((d) => d.symbol === "QQQ");
  assert.equal(spy?.status, "WIN");
  assert.equal(qqq?.status, "OPEN");
});

test("a PUT call keeps its option type and a 0-qty fill is ignored", () => {
  const drafts = matchFills([
    fill({ option: "PUT", signedQty: 0, time: new Date("2026-01-02T15:00:00Z") }),
    fill({ option: "PUT", signedQty: 1, time: new Date("2026-01-02T15:01:00Z") }),
  ]);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].option, "PUT");
  assert.equal(drafts[0].status, "OPEN");
});
