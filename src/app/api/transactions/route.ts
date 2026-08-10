import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import { Transaction } from "@/lib/models/Transaction";

// Authenticated-user scoped — both handlers ignore any client-supplied
// userId and use session.user.id instead.

type TxLean = {
  _id: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  type: "DEPOSIT" | "WITHDRAW" | "ADJUST";
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();

  const transactions = await Transaction.find({ userID: session.user.id })
    .sort({ date: 1 })
    .lean<TxLean[]>();

  // `_id` is included so the balance page can list and delete entries.
  const timeline = transactions.map((t) => ({
    _id: t._id.toString(),
    date: t.date,
    amount: t.amount,
    type: t.type,
  }));

  return NextResponse.json(timeline);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();

  try {
    const { type, amount, date } = await req.json();

    if (!type || typeof amount !== "number" || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (type !== "DEPOSIT" && type !== "WITHDRAW" && type !== "ADJUST") {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    // No cash-only "insufficient balance" gate: the running balance now
    // includes realized trade P/L, so trading gains can fund a withdrawal
    // and the timeline is recomputed chronologically on the client anyway.
    // ADJUST (reconciliation) keeps its sign — it's the +/- correction that
    // snaps the balance to the actual figure; deposits/withdrawals are stored
    // as a positive magnitude.
    const transaction = await Transaction.create({
      userID: session.user.id,
      type,
      amount: type === "ADJUST" ? amount : Math.abs(amount),
      date: new Date(date),
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
