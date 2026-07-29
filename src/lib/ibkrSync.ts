import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import Trade from "@/lib/models/Trade";
import { matchFills, type NormalizedFill } from "@/lib/ibkr/match";
import { getBrokerAdapter, DEFAULT_BROKER, type BrokerId } from "@/lib/brokers";

// Pull-sync for an auto-sync broker (e.g. IBKR): fetch the user's fills
// via the broker adapter, then run the shared import pipeline. File
// brokers (CSV upload) skip this and call `importFills` directly.
export async function syncForUser(
  userId: string,
  brokerId: BrokerId = DEFAULT_BROKER,
): Promise<{
  inserted: number;
  skipped: number;
  fetched?: number;
  matched?: number;
}> {
  const adapter = getBrokerAdapter(brokerId);
  if (!adapter.fetchFills) {
    throw new Error(
      `${adapter.label} doesn't support automatic sync — upload an export file instead.`,
    );
  }
  const fills = await adapter.fetchFills(userId);
  return importFills(userId, fills);
}

// Shared, broker-agnostic pipeline: FIFO-match fills into round-trip
// trades, dedupe against existing trades, insert the new ones, and
// record what this run did so the settings UI can show / undo the last
// import. Used by both the pull sync above and file uploads.
export async function importFills(
  userId: string,
  fills: NormalizedFill[],
): Promise<{
  inserted: number;
  skipped: number;
  fetched: number;
  matched: number;
}> {
  await connectDb();

  const trades = matchFills(fills).map((draft) => ({
    ...draft,
    userID: userId,
  }));

  if (trades.length === 0) {
    await User.findByIdAndUpdate(userId, {
      ibkrLastSync: new Date(),
      ibkrLastSyncInserted: 0,
      ibkrLastSyncSkipped: 0,
      ibkrLastSyncTradeIds: [],
    });
    return { inserted: 0, skipped: 0, fetched: fills.length, matched: 0 };
  }

  // Dedupe pass 1: by ibkrTradeId (fast, for trades imported via this sync).
  const ibkrIds = trades.map((t) => t.ibkrTradeId).filter(Boolean);
  const existingIds = ibkrIds.length
    ? await Trade.find({ ibkrTradeId: { $in: ibkrIds } })
        .select("ibkrTradeId")
        .lean()
        .then((docs) => new Set(docs.map((d) => d.ibkrTradeId)))
    : new Set<string>();

  // Dedupe pass 2: by natural key, using the calendar DAY (not exact
  // timestamps). Manual entries store dateBought/dateClosed as midnight
  // UTC, while IBKR-imported trades have real intraday timestamps. Both
  // refer to the same real-world trade if symbol+qty+strike+option match
  // and the buy/sell fall on the same trading day.
  //
  // We use a counter map (multiset) so that if a user legitimately has
  // multiple trades on the same contract on the same day, only that many
  // imports are skipped - the rest are still inserted.
  const dayPart = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const naturalKey = (t: {
    symbol: string;
    qty: number;
    strike: number;
    option: string;
    dateBought: Date;
    dateClosed?: Date | null;
  }) =>
    `${t.symbol}|${t.qty}|${t.strike}|${t.option}|${dayPart(t.dateBought)}|${dayPart(t.dateClosed)}`;

  const existingByUser = await Trade.find({ userID: userId })
    .select("symbol qty strike option dateBought dateClosed")
    .lean();
  const existingCounts = new Map<string, number>();
  for (const d of existingByUser) {
    const k = naturalKey({
      symbol: d.symbol,
      qty: d.qty,
      strike: d.strike,
      option: d.option,
      dateBought: d.dateBought,
      dateClosed: d.dateClosed,
    });
    existingCounts.set(k, (existingCounts.get(k) ?? 0) + 1);
  }

  const newTrades = trades.filter((t) => {
    if (t.ibkrTradeId && existingIds.has(t.ibkrTradeId)) return false;
    const k = naturalKey(t);
    const remaining = existingCounts.get(k) ?? 0;
    if (remaining > 0) {
      existingCounts.set(k, remaining - 1);
      return false;
    }
    return true;
  });

  let insertedIds: unknown[] = [];
  if (newTrades.length > 0) {
    const inserted = await Trade.insertMany(newTrades);
    insertedIds = inserted.map((d) => d._id);
  }

  const skipped = trades.length - newTrades.length;
  await User.findByIdAndUpdate(userId, {
    ibkrLastSync: new Date(),
    ibkrLastSyncInserted: newTrades.length,
    ibkrLastSyncSkipped: skipped,
    ibkrLastSyncTradeIds: insertedIds,
  });

  return {
    inserted: newTrades.length,
    skipped,
    fetched: fills.length,
    matched: trades.length,
  };
}

// Backfill commissions/taxes onto existing trades that have no fees, by
// re-reading the user's IBKR fills and re-matching them into trade drafts
// (which carry the exact per-trade fees). Existing trades are matched to a
// draft first by ibkrTradeId, then by the same natural key the dedupe uses
// (symbol|qty|strike|option|buy-day|sell-day). Only trades whose fees are
// missing or zero are touched; profit/loss and everything else is left
// alone. Requires the Flex query to include the commission/tax columns and
// to cover the period of the trades being fixed.
export async function backfillFeesForUser(
  userId: string,
  brokerId: BrokerId = DEFAULT_BROKER,
): Promise<{ updated: number; scanned: number; drafts: number }> {
  const adapter = getBrokerAdapter(brokerId);
  if (!adapter.fetchFills) {
    throw new Error(`${adapter.label} doesn't support fill fetching.`);
  }

  await connectDb();
  const fills = await adapter.fetchFills(userId);
  const drafts = matchFills(fills);

  const dayPart = (d: Date | string | null | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const naturalKey = (t: {
    symbol: string;
    qty: number;
    strike: number;
    option: string;
    dateBought: Date | string;
    dateClosed?: Date | string | null;
  }) =>
    `${t.symbol}|${t.qty}|${t.strike}|${t.option}|${dayPart(t.dateBought)}|${dayPart(t.dateClosed)}`;

  // Index the freshly-matched drafts' fees by id and by natural key. The
  // key map is a multiset (array) so several identical trades on one day
  // each consume their own draft.
  const byId = new Map<string, number>();
  const byKey = new Map<string, number[]>();
  for (const d of drafts) {
    if (d.ibkrTradeId) byId.set(d.ibkrTradeId, d.fees);
    const k = naturalKey(d);
    const arr = byKey.get(k) ?? [];
    arr.push(d.fees);
    byKey.set(k, arr);
  }

  const feeless = await Trade.find({
    userID: userId,
    $or: [{ fees: { $exists: false } }, { fees: 0 }, { fees: null }],
  }).select("symbol qty strike option dateBought dateClosed ibkrTradeId fees");

  const ops: Array<{
    updateOne: {
      filter: { _id: unknown };
      update: { $set: { fees: number } };
    };
  }> = [];

  for (const t of feeless) {
    let fee: number | undefined;
    if (t.ibkrTradeId && byId.has(t.ibkrTradeId)) {
      fee = byId.get(t.ibkrTradeId);
    } else {
      const arr = byKey.get(naturalKey(t));
      if (arr && arr.length) fee = arr.shift(); // consume one match
    }
    if (fee != null && fee > 0) {
      ops.push({
        updateOne: { filter: { _id: t._id }, update: { $set: { fees: fee } } },
      });
    }
  }

  if (ops.length > 0) await Trade.bulkWrite(ops);

  return { updated: ops.length, scanned: feeless.length, drafts: drafts.length };
}
