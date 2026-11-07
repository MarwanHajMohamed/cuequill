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

// What's stored in ibkrPendingImport: the draft plus a skipped flag. There's
// deliberately no stored id - a trade's position in the array IS its key, so
// selection can't break if a generated id fails to survive the round-trip.
type StoredPending = PlannedTrade & { _skipped: boolean };

// Client-facing pending trade: the stored fields plus `_key` (its index as a
// string), which the UI sends back to import that specific trade.
export type PendingTrade = PlannedTrade & { _key: string; _skipped: boolean };

// Attach positional keys for the client.
function withKeys(arr: StoredPending[]): PendingTrade[] {
  return arr.map((t, i) => ({ ...t, _key: String(i) }));
}

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
  // The matched trades that were deduped out (look like duplicates of
  // existing ones). Kept so the user can review and import them anyway.
  skippedTrades: PlannedTrade[];
  fetched: number;
  matched: number;
}> {
  await connectDb();

  const trades: PlannedTrade[] = matchFills(fills).map((draft) => ({
    ...draft,
    userID: userId,
  }));

  if (trades.length === 0) {
    return { newTrades: [], skippedTrades: [], fetched: fills.length, matched: 0 };
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

  const newTrades: PlannedTrade[] = [];
  const skippedTrades: PlannedTrade[] = [];
  for (const t of trades) {
    const dupById = !!t.ibkrTradeId && existingIds.has(t.ibkrTradeId);
    const k = naturalKey(t);
    const remaining = existingCounts.get(k) ?? 0;
    if (dupById || remaining > 0) {
      if (!dupById) existingCounts.set(k, remaining - 1);
      skippedTrades.push(t);
    } else {
      newTrades.push(t);
    }
  }

  return {
    newTrades,
    skippedTrades,
    fetched: fills.length,
    matched: trades.length,
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
  await commitTrades(userId, plan.newTrades, plan.skippedTrades.length);
  return {
    inserted: plan.newTrades.length,
    skipped: plan.skippedTrades.length,
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
  trades: PendingTrade[];
}> {
  const fills = await fetchSyncFills(userId, brokerId);
  const plan = await computeImportPlan(userId, fills);

  // Stash new and skipped together (skipped flagged), in order. Position in
  // the array is the key the UI selects by.
  const keyed: StoredPending[] = [
    ...plan.newTrades.map((t) => ({ ...t, _skipped: false })),
    ...plan.skippedTrades.map((t) => ({ ...t, _skipped: true })),
  ];

  await User.findByIdAndUpdate(userId, {
    ibkrPendingImport: keyed,
    ibkrPendingSkipped: plan.skippedTrades.length,
  });

  return {
    fetched: plan.fetched,
    matched: plan.matched,
    skipped: plan.skippedTrades.length,
    trades: withKeys(keyed),
  };
}

// Read the pending stash (new + skipped), still-staged trades the user
// hasn't imported, each with its positional key.
export async function getPendingImport(userId: string): Promise<PendingTrade[]> {
  await connectDb();
  const user = await User.findById(userId).select("ibkrPendingImport");
  return withKeys((user?.ibkrPendingImport ?? []) as StoredPending[]);
}

// Commit staged trades. No IBKR call. With `keys` (positional indices as
// strings), import exactly those (new or skipped - the user's explicit
// pick); without, import every NEW trade and leave the skipped ones staged.
// Imported trades leave the stash; the rest stay for later.
export async function commitPendingImport(
  userId: string,
  keys?: string[],
): Promise<{ inserted: number; remaining: number; remainingSkipped: number }> {
  await connectDb();
  const user = await User.findById(userId).select("ibkrPendingImport");
  const pending = (user?.ibkrPendingImport ?? []) as StoredPending[];

  const selectedIdx = new Set<number>();
  if (keys) {
    for (const k of keys) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i < pending.length) selectedIdx.add(i);
    }
  } else {
    pending.forEach((p, i) => {
      if (!p._skipped) selectedIdx.add(i);
    });
  }

  const selected = pending.filter((_, i) => selectedIdx.has(i));
  const remaining = pending.filter((_, i) => !selectedIdx.has(i));

  // Strip the stash-only field before inserting into the journal.
  const toInsert: PlannedTrade[] = selected.map((p) => {
    const rest = { ...p } as Partial<StoredPending>;
    delete rest._skipped;
    return rest as PlannedTrade;
  });

  const remainingSkipped = remaining.filter((p) => p._skipped).length;
  const inserted = await commitTrades(userId, toInsert, remainingSkipped);

  await User.findByIdAndUpdate(userId, {
    ibkrPendingImport: remaining,
    ibkrPendingSkipped: remainingSkipped,
  });

  return { inserted, remaining: remaining.length, remainingSkipped };
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
