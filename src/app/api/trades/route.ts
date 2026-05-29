import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";
import mongoose from "mongoose";

// Get trades for each user
export async function GET(req: NextRequest) {
  await connectDB();

  const userId = req.nextUrl.searchParams.get("userId");
  const simulated = req.nextUrl.searchParams.get("simulated");
  const month = req.nextUrl.searchParams.get("month");
  const year = req.nextUrl.searchParams.get("year");

  try {
    const query: Record<string, unknown> = {};

    if (userId) {
      query.userID = new mongoose.Types.ObjectId(userId);
    }

    if (simulated === "true") query.simulated = true;
    if (simulated === "false") query.simulated = false;

    if (month && year) {
      const m = Number(month);
      const y = Number(year);

      const startDate = new Date(y, m, 1);
      const endDate = new Date(y, m + 1, 0, 23, 59, 59);

      // Closed trades attribute to their EXIT month (matches broker P/L
      // accounting). Open trades attribute to their ENTRY month. Closed
      // trades with no dateClosed fall back to dateBought.
      query.$or = [
        {
          status: { $in: ["WIN", "LOSS"] },
          dateClosed: { $gte: startDate, $lte: endDate },
        },
        {
          status: { $in: ["WIN", "LOSS"] },
          $or: [{ dateClosed: { $exists: false } }, { dateClosed: null }],
          dateBought: { $gte: startDate, $lte: endDate },
        },
        {
          status: "OPEN",
          dateBought: { $gte: startDate, $lte: endDate },
        },
      ];
    }

    const trades = await Trade.find(query).sort({ dateBought: -1 });

    return NextResponse.json(trades);
  } catch (err) {
    console.error("Error fetching trades:", err);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

// Add a new trade
export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();
    const trade = await Trade.create(body);
    return NextResponse.json(trade, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create trade";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Delete all trades
export async function DELETE(req: NextRequest) {
  await connectDB();

  try {
    const { userId, simulated }: { userId: string; simulated: boolean } =
      await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const filter: Record<string, unknown> = {
      userID: new mongoose.Types.ObjectId(userId),
    };

    if (simulated) {
      filter.simulated = true;
    } else if (!simulated) {
      filter.simulated = { $ne: true };
    }

    const result = await Trade.deleteMany(filter);

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} trades.`,
    });
  } catch (err) {
    console.error("Delete trades error:", err);
    return NextResponse.json(
      { error: "Failed to delete all trades", details: err },
      { status: 500 }
    );
  }
}
