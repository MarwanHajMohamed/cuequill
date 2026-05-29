/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Backfill `fees` on Cuequill trades from IBKR commission data.
 *
 * Cuequill stores most timestamps as date-only (midnight UTC), so we can't
 * rely on a tight time window to match IBKR trades. The matcher runs in
 * two passes:
 *
 *   1. INTRADAY: for any Cuequill trade whose dateBought has a non-midnight
 *      time (i.e., manually-entered with a real timestamp), find the IBKR
 *      order with the same symbol + qty within ±15 minutes.
 *   2. DAY-ONLY: for the rest, bucket IBKR orders by (symbol, calendar day,
 *      qty). For each Cuequill trade, claim the next unmatched IBKR order
 *      of that bucket for its buy date and its sell date. Sequential
 *      pairing — if you had 3 AMZN qty=1 buys on a day, they pair to the
 *      first 3 unclaimed IBKR AMZN qty=1 BUY orders of that day.
 *
 * Run:
 *   node scripts/backfill-fees.js               # dry-run, prints plan
 *   node scripts/backfill-fees.js --apply       # writes to DB
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

(function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
})();

const MATCH_WINDOW_MS = 15 * 60 * 1000;
const APPLY = process.argv.includes("--apply");

const Trade =
  mongoose.models.Trade ||
  mongoose.model(
    "Trade",
    new mongoose.Schema({}, { strict: false, collection: "trades" }),
  );

function dayKey(ms) {
  return new Date(ms).toISOString().split("T")[0];
}

function isMidnightUtc(d) {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }

  const ibkr = JSON.parse(
    fs.readFileSync(path.join(__dirname, "ibkr-trades.json"), "utf8"),
  ).trades;
  console.log(`Loaded ${ibkr.length} IBKR legs`);

  // CONTRACT POOL: aggregate all IBKR option legs by (symbol, day, side).
  // Each pool tracks total contracts and total commission across all legs.
  // Cuequill trades draw qty contracts from the pool and pay the pool's
  // per-contract commission rate. Handles split orders, aggregated orders,
  // and partial fills uniformly.
  const pools = new Map();
  for (const leg of ibkr) {
    if (leg.sec_type !== "OPT") continue;
    const timeMs = new Date(leg.trade_time).getTime();
    const k = `${leg.symbol}|${dayKey(timeMs)}|${leg.side}`;
    const prev = pools.get(k) ?? {
      key: k,
      symbol: leg.symbol,
      day: dayKey(timeMs),
      side: leg.side,
      totalContracts: 0,
      totalCommission: 0,
      claimedContracts: 0,
    };
    prev.totalContracts += leg.size;
    prev.totalCommission += leg.commission ?? 0;
    pools.set(k, prev);
  }
  console.log(`Built ${pools.size} (symbol, day, side) contract pools`);

  // Also keep an order-level index for the intraday tight-match pass.
  const ordersById = new Map();
  for (const leg of ibkr) {
    if (leg.sec_type !== "OPT") continue;
    const key = String(leg.order_id ?? leg.trade_id);
    const prev = ordersById.get(key) ?? {
      order_id: key,
      symbol: leg.symbol,
      side: leg.side,
      timeMs: new Date(leg.trade_time).getTime(),
      totalSize: 0,
      totalCommission: 0,
    };
    prev.totalSize += leg.size;
    prev.totalCommission += leg.commission ?? 0;
    prev.timeMs = Math.min(prev.timeMs, new Date(leg.trade_time).getTime());
    ordersById.set(key, prev);
  }
  const orders = Array.from(ordersById.values()).sort(
    (a, b) => a.timeMs - b.timeMs,
  );

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const trades = await Trade.find({ simulated: { $ne: true } }).lean();
  console.log(`Loaded ${trades.length} non-simulated Cuequill trades`);

  // Sort Cuequill trades by dateBought, then dateClosed — gives stable
  // sequential pairing when multiple same-day trades have midnight times.
  trades.sort((a, b) => {
    const ab = new Date(a.dateBought).getTime();
    const bb = new Date(b.dateBought).getTime();
    if (ab !== bb) return ab - bb;
    const ac = a.dateClosed ? new Date(a.dateClosed).getTime() : 0;
    const bc = b.dateClosed ? new Date(b.dateClosed).getTime() : 0;
    return ac - bc;
  });

  const minIbkrMs = Math.min(...orders.map((o) => o.timeMs));
  const coverStr = new Date(minIbkrMs).toISOString().split("T")[0];

  // INTRADAY: tight time-window match for Cuequill trades with real times.
  function findIntraday(side, sym, qty, targetMs) {
    let best = null;
    let bestDelta = MATCH_WINDOW_MS + 1;
    for (const o of orders) {
      if (o.matched) continue;
      if (o.side !== side) continue;
      if (o.symbol !== sym) continue;
      if (o.totalSize !== qty) continue;
      const d = Math.abs(o.timeMs - targetMs);
      if (d <= MATCH_WINDOW_MS && d < bestDelta) {
        best = o;
        bestDelta = d;
      }
    }
    return best;
  }

  // DAY-ONLY: draw qty contracts from the (symbol, day, side) pool.
  // Returns the commission attributable to those qty contracts (qty *
  // per-contract rate from the pool's total) and decrements the pool.
  function drawFromPool(side, sym, qty, dayStr) {
    const k = `${sym}|${dayStr}|${side}`;
    const pool = pools.get(k);
    if (!pool) return null;
    const remaining = pool.totalContracts - pool.claimedContracts;
    if (remaining < qty) return null;
    const perContract = pool.totalCommission / pool.totalContracts;
    pool.claimedContracts += qty;
    return {
      commission: qty * perContract,
      poolKey: k,
    };
  }

  const updates = [];
  const skipped = [];

  for (const t of trades) {
    const sym = (t.symbol || "").toUpperCase();
    const qty = t.qty;
    const isClosed = t.status === "WIN" || t.status === "LOSS";
    const dateBoughtMs = new Date(t.dateBought).getTime();

    if (dateBoughtMs < minIbkrMs - 24 * 60 * 60 * 1000) {
      skipped.push({
        _id: String(t._id),
        symbol: sym,
        qty,
        status: t.status,
        dateBought: t.dateBought,
        reason: "before-ibkr-coverage",
      });
      continue;
    }

    const dateBoughtIsExact = !isMidnightUtc(new Date(t.dateBought));
    const dateClosedIsExact =
      isClosed && t.dateClosed && !isMidnightUtc(new Date(t.dateClosed));

    // Buy side
    let buyMatch = dateBoughtIsExact
      ? findIntraday("BUY", sym, qty, dateBoughtMs)
      : null;
    let buyCommission = buyMatch?.totalCommission ?? null;
    if (buyMatch) buyMatch.matched = true;
    if (buyCommission === null) {
      const draw = drawFromPool("BUY", sym, qty, dayKey(dateBoughtMs));
      if (draw) buyCommission = draw.commission;
    }

    // Sell side
    let sellCommission = null;
    if (isClosed && t.dateClosed) {
      const dateClosedMs = new Date(t.dateClosed).getTime();
      const sellMatch = dateClosedIsExact
        ? findIntraday("SELL", sym, qty, dateClosedMs)
        : null;
      if (sellMatch) {
        sellMatch.matched = true;
        sellCommission = sellMatch.totalCommission;
      } else {
        const draw = drawFromPool("SELL", sym, qty, dayKey(dateClosedMs));
        if (draw) sellCommission = draw.commission;
      }
    }

    let reason = null;
    if (buyCommission === null && sellCommission === null)
      reason = "no-match";
    else if (buyCommission === null) reason = "no-buy-match";
    else if (isClosed && sellCommission === null) reason = "no-sell-match";

    if (reason) {
      skipped.push({
        _id: String(t._id),
        symbol: sym,
        qty,
        status: t.status,
        dateBought: t.dateBought,
        dateClosed: t.dateClosed,
        reason,
      });
      continue;
    }

    const fees =
      Math.round(100 * ((buyCommission ?? 0) + (sellCommission ?? 0))) / 100;

    updates.push({
      _id: t._id,
      symbol: sym,
      qty,
      status: t.status,
      previousFees: t.fees ?? 0,
      newFees: fees,
    });
  }

  console.log("\n--- Match summary ---");
  console.log(`Matched: ${updates.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`IBKR coverage starts: ${coverStr}`);
  const reasons = {};
  for (const s of skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;
  console.log(`Reason breakdown:`);
  for (const [k, v] of Object.entries(reasons)) console.log(`  ${k}: ${v}`);

  // Stats on fees applied
  const totalFees = updates.reduce((s, u) => s + u.newFees, 0);
  console.log(`Total fees being attributed: $${totalFees.toFixed(2)}`);

  // Pool depletion stats
  let poolContractsTotal = 0;
  let poolContractsClaimed = 0;
  for (const p of pools.values()) {
    poolContractsTotal += p.totalContracts;
    poolContractsClaimed += p.claimedContracts;
  }
  console.log(
    `IBKR pool: ${poolContractsClaimed}/${poolContractsTotal} contracts claimed (${(
      (100 * poolContractsClaimed) /
      Math.max(1, poolContractsTotal)
    ).toFixed(1)}%)`,
  );

  if (skipped.length > 0) {
    const nonCoverage = skipped.filter((s) => s.reason !== "before-ibkr-coverage");
    console.log(`\nNon-coverage skips (${nonCoverage.length}):`);
    for (const s of nonCoverage) {
      console.log(
        `  ${s.symbol} qty=${s.qty} ${s.status} bought=${new Date(s.dateBought).toISOString().split("T")[0]} closed=${s.dateClosed ? new Date(s.dateClosed).toISOString().split("T")[0] : "—"} -- ${s.reason}`,
      );
    }
  }

  if (!APPLY) {
    console.log("\nDRY RUN — no DB changes. Re-run with --apply to write.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\nApplying ${updates.length} updates...`);
  let written = 0;
  for (const u of updates) {
    await Trade.updateOne({ _id: u._id }, { $set: { fees: u.newFees } });
    written++;
    if (written % 25 === 0) console.log(`  ${written}/${updates.length}`);
  }
  console.log(`Done. Wrote ${written} updates.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
