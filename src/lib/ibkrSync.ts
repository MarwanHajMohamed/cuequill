import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import Trade from "@/lib/models/Trade";
import {
  matchFills,
  type NormalizedFill,
  type TradeDraft,
} from "@/lib/ibkr/match";
import { getBrokerAdapter, DEFAULT_BROKER, type BrokerId } from "@/lib/brokers";

// A matched trade draft with its owner attached, ready to insert.
type PlannedTrade = TradeDraft & { userID: string };

// Pull-sync for an auto-sync broker (e.g. IBKR): fetch the user's fills
// via the broker adapter (the IBKR Activity Flex query), then run the
// shared import pipeline. File brokers (CSV upload) skip this and call
// `importFills` directly.
export async function syncForUser(
  userId: string,
  brokerId: BrokerId = DEFAULT_BROKER,
): Promise<{
  inserted: number;
  skipped: number;
  fetched?: number;
  matched?: number;
}> {
  const fills = await fetchSyncFills(userId, brokerId);
  return importFills(userId, fills);
}

// Source the fills a sync run should import. Pure fetch - no writes - so
// it's shared by the live sync and the preview path. For IBKR this is the
// Activity Flex query (the adapter reads the user's token + query id).
async function fetchSyncFills(
  userId: string,
  brokerId: BrokerId,
): Promise<NormalizedFill[]> {
  const adapter = getBrokerAdapter(brokerId);
  if (!adapter.fetchFills) {
    throw new Error(
      `${adapter.label} doesn't support automatic sync. Upload an export file instead.`,
    );
  }
  return adapter.fetchFills(userId);
}

// Work out what importing these fills WOULD do - FIFO-match into trades,
// then dedupe against the user's existing trades - without writing
// anything. Returns the trades that would be newly inserted plus counts.
// Shared by the live import and the preview.
async function computeImportPlan(
  userId: string,
  fills: NormalizedFill[],
): Promise<{
  newTrades: PlannedTrade[];
  fetched: number;
  matched: number;
  skipped: number;
}> {
  await connectDb();

  const trades: PlannedTrade[] = matchFills(fills).map((draft) => ({
    ...draft,
    userID: userId,
  }));

  if (trades.length === 0) {
    return { newTrades: [], fetched: fills.length, matched: 0, skipped: 0 };
  }

  // Dedupe pass 1: by ibkrTradeId (fast, for trades imported via this sync).
  const ibkrIds = trades.map((t) => t.ibkrTradeId).filter(Boolean);
  const existingIds = ibkrIds.length
    ? await Trade.find({ ibkrTradeId: { $in: ibkrIds } })
        .select("ibkrTradeId")
        .lean()
        .then((docs) => new Set(docs.map((d) => d.ibkrTradeId)))
    : new Set<string>();

  // Dedupe pass 2: by a RELAXED natural key - the contract plus the day it
  // was opened (symbol + option + strike + entry-day). We deliberately
  // DON'T key on quantity or the close date: a hand-logged trade is entered
  // approximately (IBKR splits fills FIFO so quantities differ, and the
  // close date a user types rarely matches IBKR's exact settlement day), so
  // keying on those made the dedupe miss hand-logged trades and re-import
  // them as duplicates. This is safe because the user has confirmed they
  // never open two separate positions on the same contract on the same day;
  // the multiset counter below still lets any such case through if it arose.
  const dayPart = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const naturalKey = (t: {
    symbol: string;
    strike: number;
    option: string;
    dateBought: Date;
  }) => `${t.symbol}|${t.option}|${t.strike}|${dayPart(t.dateBought)}`;

  const existingByUser = await Trade.find({ userID: userId })
    .select("symbol strike option dateBought")
    .lean();
  const existingCounts = new Map<string, number>();
  for (const d of existingByUser) {
    const k = naturalKey({
      symbol: d.symbol,
      strike: d.strike,
      option: d.option,
      dateBought: d.dateBought,
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

  return {
    newTrades,
    fetched: fills.length,
    matched: trades.length,
    skipped: trades.length - newTrades.length,
  };
}

// Insert a set of already-planned trades and record the run so the
// settings UI can show / undo it.
async function commitTrades(
  userId: string,
  newTrades: PlannedTrade[],
  skipped: number,
): Promise<number> {
  await connectDb();

  let insertedIds: unknown[] = [];
  if (newTrades.length > 0) {
    const inserted = await Trade.insertMany(newTrades);
    insertedIds = inserted.map((d) => d._id);
  }

  await User.findByIdAndUpdate(userId, {
    ibkrLastSync: new Date(),
    ibkrLastSyncInserted: newTrades.length,
    ibkrLastSyncSkipped: skipped,
    ibkrLastSyncTradeIds: insertedIds,
  });

  return newTrades.length;
}

// Shared, broker-agnostic pipeline: match + dedupe + insert in one shot.
// Used by the auto-sync cron and by file uploads (which import directly,
// without the manual preview/confirm step).
export async function importFills(
  userId: string,
  fills: NormalizedFill[],
): Promise<{
  inserted: number;
  skipped: number;
  fetched: number;
  matched: number;
}> {
  const plan = await computeImportPlan(userId, fills);
  await commitTrades(userId, plan.newTrades, plan.skipped);
  return {
    inserted: plan.newTrades.length,
    skipped: plan.skipped,
    fetched: plan.fetched,
    matched: plan.matched,
  };
}

// Preview a manual sync: fetch + match + dedupe, then STASH the would-be-new
// trades on the user instead of inserting them. The user reviews the plan
// and confirms (commitPendingImport) before anything is written - so a bad
// match can't silently flood the journal. Stashing also means confirming
// doesn't have to hit IBKR again (avoiding a fresh rate-limit / 1001).
export async function previewSyncForUser(
  userId: string,
  brokerId: BrokerId = DEFAULT_BROKER,
): Promise<{
  fetched: number;
  matched: number;
  skipped: number;
  trades: PlannedTrade[];
}> {
  const fills = await fetchSyncFills(userId, brokerId);
  const plan = await computeImportPlan(userId, fills);

  await User.findByIdAndUpdate(userId, {
    ibkrPendingImport: plan.newTrades,
    ibkrPendingSkipped: plan.skipped,
  });

  return {
    fetched: plan.fetched,
    matched: plan.matched,
    skipped: plan.skipped,
    trades: plan.newTrades,
  };
}

// Commit the trades staged by the last preview. No IBKR call - it inserts
// exactly what the user saw and confirmed, then clears the stash.
export async function commitPendingImport(
  userId: string,
): Promise<{ inserted: number; skipped: number }> {
  await connectDb();
  const user = await User.findById(userId).select(
    "ibkrPendingImport ibkrPendingSkipped",
  );
  const pending = (user?.ibkrPendingImport ?? []) as PlannedTrade[];
  const skipped = user?.ibkrPendingSkipped ?? 0;

  const inserted = await commitTrades(userId, pending, skipped);

  await User.findByIdAndUpdate(userId, {
    ibkrPendingImport: [],
    ibkrPendingSkipped: 0,
  });

  return { inserted, skipped };
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
