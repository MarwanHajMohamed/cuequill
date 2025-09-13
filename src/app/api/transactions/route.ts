import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { Transaction } from "@/lib/models/Transaction";
import Trade from "@/lib/models/Trade";
import { BalanceEvent } from "@/app/types/Transactions";

// GET handler
export async function GET(req: NextRequest) {
  await connectDb();

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const transactions = await Transaction.find({ userID: userId });

  const events: BalanceEvent[] = [];

  // Push all transactions
  for (const t of transactions) {
    events.push({
      date: t.date,
      amount: t.amount,
      type: t.type,
    });
  }

  // Sort events by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const timeline = events.map((e) => ({
    date: e.date,
    amount: e.amount,
    type: e.type,
  }));

  return NextResponse.json(timeline);
}

export async function POST(req: NextRequest) {
  await connectDb();

  try {
    const { userId, type, amount, date } = await req.json();

    if (!userId || !type || typeof amount !== "number" || !date) {
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

    // Calculate current balance
    const transactions = await Transaction.find({ userID: userId });

    let currentBalance = 0;
    for (const t of transactions) {
      currentBalance += t.type === "DEPOSIT" ? t.amount : -t.amount;
    }

    // Check withdrawal limit
    if (type === "WITHDRAW" && amount > currentBalance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = await Transaction.create({
      userID: userId,
      type,
      amount,
      date: new Date(date),
    });

    // Return the transaction and new balance
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
