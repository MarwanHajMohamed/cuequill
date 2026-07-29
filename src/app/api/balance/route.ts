import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import { BalanceSnapshot } from "@/lib/models/BalanceSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotLean = {
  _id: mongoose.Types.ObjectId;
  date: string;
  balance: number;
  currency?: string;
  source: "ibkr" | "manual";
};

// GET — the user's whole balance timeline, oldest day first.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const snapshots = await BalanceSnapshot.find({ userID: session.user.id })
    .sort({ date: 1 })
    .lean<SnapshotLean[]>();

  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      _id: s._id.toString(),
      date: s.date,
      balance: s.balance,
      currency: s.currency ?? null,
      source: s.source,
    })),
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST — add or correct a manual snapshot for a day. Upserts the same
// (userID, date) slot so re-submitting a day edits it in place.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const balance =
    typeof body.balance === "number" ? body.balance : Number(body.balance);
  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase().slice(0, 3)
      : undefined;

  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "A valid date (yyyy-MM-dd) is required." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(balance)) {
    return NextResponse.json(
      { error: "A numeric balance is required." },
      { status: 400 },
    );
  }

  await connectDb();
  const doc = await BalanceSnapshot.findOneAndUpdate(
    { userID: session.user.id, date },
    {
      $set: { balance, source: "manual", ...(currency ? { currency } : {}) },
      $setOnInsert: { userID: session.user.id, date },
    },
    { upsert: true, new: true },
  ).lean<SnapshotLean>();

  return NextResponse.json({
    snapshot: doc && {
      _id: doc._id.toString(),
      date: doc.date,
      balance: doc.balance,
      currency: doc.currency ?? null,
      source: doc.source,
    },
  });
}
