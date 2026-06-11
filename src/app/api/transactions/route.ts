import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { Transaction } from "@/lib/models/Transaction";
import { BalanceEvent } from "@/app/types/Transactions";

// Authenticated-user scoped — both handlers ignore any client-supplied
// userId and use session.user.id instead.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();

  const transactions = await Transaction.find({ userID: session.user.id });

  const events: BalanceEvent[] = [];

  for (const t of transactions) {
    events.push({
      date: t.date,
      amount: t.amount,
      type: t.type,
    });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const timeline = events.map((e) => ({
    date: e.date,
    amount: e.amount,
    type: e.type,
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

    if (type !== "DEPOSIT" && type !== "WITHDRAW") {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    // Calculate current balance — use the authenticated user.
    const transactions = await Transaction.find({ userID: session.user.id });

    let currentBalance = 0;
    for (const t of transactions) {
      currentBalance += t.type === "DEPOSIT" ? t.amount : -t.amount;
    }

    if (type === "WITHDRAW" && amount > currentBalance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const transaction = await Transaction.create({
      userID: session.user.id,
      type,
      amount,
      date: new Date(date),
    });

    const newBalance =
      type === "DEPOSIT" ? currentBalance + amount : currentBalance - amount;
    return NextResponse.json(
      { transaction, balance: newBalance },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
