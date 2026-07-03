import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

// Merge 2+ trades on the same contract into a single row. Broker
// partial-fills often land as separate imports (e.g. one 10-lot order
// filled in three chunks), so this collapses them: qty summed, entry
// and exit prices weighted-avg'd by qty, fees/P/L summed, earliest
// entry / latest exit preserved. The originals are deleted after the
// merged doc is written.

type MergeBody = { ids?: unknown };

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const body = (await req.json().catch(() => ({}))) as MergeBody;
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = Array.from(
    new Set(
      rawIds.filter(
        (v): v is string =>
          typeof v === "string" && mongoose.Types.ObjectId.isValid(v),
      ),
    ),
  );
  if (ids.length < 2) {
    return NextResponse.json(
      { error: "Select at least two trades to merge." },
      { status: 400 },
    );
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const trades = await Trade.find({
    _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
    userID: userId,
  });

  if (trades.length !== ids.length) {
    return NextResponse.json(
      { error: "Some trades could not be found." },
      { status: 404 },
    );
  }

  // Contract identity: symbol, option side, strike, expiry day. Expiry
  // is compared by calendar day so a manual entry (midnight UTC) can
  // merge with an IBKR-imported fill that carries a real timestamp.
  const first = trades[0];
  const expiryDay = (d: Date) => new Date(d).toISOString().split("T")[0];
  const firstExpiry = expiryDay(first.expiryDate);
  const contractMismatch = trades.some(
    (t) =>
      t.symbol !== first.symbol ||
      t.option !== first.option ||
      t.strike !== first.strike ||
      expiryDay(t.expiryDate) !== firstExpiry,
  );
  if (contractMismatch) {
    return NextResponse.json(
      {
        error:
          "Trades must share the same symbol, side, strike, and expiry to merge.",
      },
      { status: 400 },
    );
  }

  // Don't mix open + closed (weighted-avg exit price is undefined) or
  // real + simulated (would corrupt paper-trading stats).
  const allOpen = trades.every((t) => t.status === "OPEN");
  const allClosed = trades.every(
    (t) => t.status === "WIN" || t.status === "LOSS",
  );
  if (!allOpen && !allClosed) {
    return NextResponse.json(
      { error: "Can't merge open and closed trades together." },
      { status: 400 },
    );
  }
  const simulatedMix = trades.some((t) => t.simulated !== first.simulated);
  if (simulatedMix) {
    return NextResponse.json(
      { error: "Can't merge real and simulated trades together." },
      { status: 400 },
    );
  }

  const totalQty = trades.reduce((s, t) => s + (t.qty || 0), 0);
  if (totalQty <= 0) {
    return NextResponse.json(
      { error: "Merged quantity must be positive." },
      { status: 400 },
    );
  }

  const wavg = (pick: (t: (typeof trades)[number]) => number | null | undefined) => {
    let num = 0;
    let den = 0;
    for (const t of trades) {
      const v = pick(t);
      if (v == null || Number.isNaN(v)) continue;
      const q = t.qty || 0;
      num += Number(v) * q;
      den += q;
    }
    return den > 0 ? num / den : 0;
  };

  const dateBought = new Date(
    Math.min(...trades.map((t) => new Date(t.dateBought).getTime())),
  );

  const totalFees = round4(trades.reduce((s, t) => s + (t.fees || 0), 0));
  const contractPrice = round4(wavg((t) => t.contractPrice));

  // Preserve the first non-empty metadata field so the merged row
  // keeps user context (notes, strategy tag, star). Sorted by entry
  // time so "first" means the earliest leg.
  const byEntry = [...trades].sort(
    (a, b) => new Date(a.dateBought).getTime() - new Date(b.dateBought).getTime(),
  );
  const firstWith = <T,>(pick: (t: (typeof trades)[number]) => T | undefined | null) => {
    for (const t of byEntry) {
      const v = pick(t);
      if (v != null && v !== "") return v;
    }
    return undefined;
  };

  const strategy = firstWith((t) => t.strategy) ?? "Other";
  const notes = firstWith((t) => t.notes) ?? "";
  const favourite = trades.some((t) => !!t.favourite);
  const tags = Array.from(
    new Set(trades.flatMap((t) => (Array.isArray(t.tags) ? t.tags : []))),
  );

  const mergedBase = {
    userID: userId,
    symbol: first.symbol,
    option: first.option,
    strike: first.strike,
    expiryDate: first.expiryDate,
    dateBought,
    contractPrice,
    qty: totalQty,
    fees: totalFees,
    simulated: first.simulated,
    favourite,
    strategy,
    notes,
    tags,
  };

  let mergedDoc;
  if (allClosed) {
    const closingContractPrice = round4(wavg((t) => t.closingContractPrice));
    const profitLoss = round2(
      trades.reduce((s, t) => s + (t.profitLoss || 0), 0),
    );
    const dateClosed = new Date(
      Math.max(
        ...trades.map((t) =>
          new Date(t.dateClosed || t.dateBought).getTime(),
        ),
      ),
    );
    mergedDoc = await Trade.create({
      ...mergedBase,
      closingContractPrice,
      profitLoss,
      dateClosed,
      // Recompute from the summed P/L: individual legs can be a mix of
      // WIN and LOSS (avg-down cases), so honour the net outcome.
      status: profitLoss >= 0 ? "WIN" : "LOSS",
    });
  } else {
    mergedDoc = await Trade.create({ ...mergedBase, status: "OPEN" });
  }

  // Snapshot the originals BEFORE deleting so we can return them to
  // the client for undo. Stripping _id from the snapshot lets the
  // undo endpoint insert them as fresh docs with new ids.
  const originalsSnapshot = trades.map((t) => {
    const obj = t.toObject();
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  // Delete the originals. If any delete fails, roll back the merged
  // doc so the user isn't left with duplicates on their sheet.
  try {
    await Trade.deleteMany({
      _id: { $in: trades.map((t) => t._id) },
      userID: userId,
    });
  } catch (err) {
    await Trade.deleteOne({ _id: mergedDoc._id });
    return NextResponse.json(
      {
        error: "Merge failed while removing the originals. No changes made.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { trade: mergedDoc, originals: originalsSnapshot },
    { status: 201 },
  );
}
