import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import Trade from "@/lib/models/Trade";

// Returns the trades inserted by the most recent IBKR sync, each
// annotated with `hasDuplicate: true` when another trade by the same
// user matches the natural key (symbol + qty + strike + option + day).
// The settings UI uses the duplicate flag to surface trades the
// import-time dedupe may have missed - usually because the user logged
// the trade manually before the sync ran.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "ibkrLastSyncTradeIds ibkrLastSync",
  );

  const ids = (user?.ibkrLastSyncTradeIds ?? []) as unknown[];
  if (ids.length === 0) {
    return NextResponse.json({ trades: [], lastSync: user?.ibkrLastSync ?? null });
  }

  const imported = (await Trade.find({ _id: { $in: ids } })
    .lean()) as unknown as Array<
    Record<string, unknown> & {
      symbol: string;
      qty: number;
      strike: number;
      option: string;
      dateBought: Date;
      dateClosed?: Date | null;
    }
  >;

  // Build a counter of all trades by natural key, then anything that
  // counts > 1 (the imported trade itself plus another) is flagged.
  const dayPart = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  type KeyableTrade = {
    symbol: string;
    qty: number;
    strike: number;
    option: string;
    dateBought: Date;
    dateClosed?: Date | null;
  };
  const naturalKey = (t: KeyableTrade) =>
    `${t.symbol}|${t.qty}|${t.strike}|${t.option}|${dayPart(t.dateBought)}|${dayPart(t.dateClosed)}`;

  const all = await Trade.find({ userID: session.user.id })
    .select("symbol qty strike option dateBought dateClosed")
    .lean();
  const counts = new Map<string, number>();
  for (const t of all) {
    const k = naturalKey({
      symbol: t.symbol,
      qty: t.qty,
      strike: t.strike,
      option: t.option,
      dateBought: t.dateBought,
      dateClosed: t.dateClosed,
    });
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  // Sort newest-first by closure or entry date so the user sees the
  // most recently imported on top.
  const trades = imported
    .map((t) => ({
      ...t,
      hasDuplicate: (counts.get(naturalKey(t)) ?? 0) > 1,
    }))
    .sort(
      (a, b) =>
        new Date(b.dateClosed || b.dateBought).getTime() -
        new Date(a.dateClosed || a.dateBought).getTime(),
    );

  return NextResponse.json({
    trades,
    lastSync: user?.ibkrLastSync ?? null,
  });
}

// Undo the most recent sync: delete exactly the trades it inserted
// (tracked in ibkrLastSyncTradeIds), scoped to this user. This reverses
// a bad import - e.g. one that slipped duplicates past the dedupe -
// without touching anything the user logged beforehand. Idempotent: once
// the tracked list is cleared, a second call deletes nothing.
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "ibkrLastSyncTradeIds",
  );
  const ids = (user?.ibkrLastSyncTradeIds ?? []) as unknown[];
  if (ids.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Scope the delete to this user's own trades as a safety belt - only
  // the last sync's inserts, never anything else.
  const res = await Trade.deleteMany({
    _id: { $in: ids },
    userID: session.user.id,
  });

  await User.findByIdAndUpdate(session.user.id, {
    ibkrLastSyncTradeIds: [],
    ibkrLastSyncInserted: 0,
    ibkrLastSyncSkipped: 0,
  });

  return NextResponse.json({ deleted: res.deletedCount ?? 0 });
}
