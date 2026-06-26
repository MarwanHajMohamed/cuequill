import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import mongoose from "mongoose";

// Free tier sees 90 days of history; Pro is unlimited. Closed trades
// attribute on dateClosed (falling back to dateBought), open trades on
// dateBought. Computed as a single Mongo filter so the cap applies
// before the DB ships rows back.
const FREE_HISTORY_DAYS = 90;

// All handlers in this file derive the user identity from the
// authenticated session — any `userId` value the client sends is
// ignored. Previously the GET / POST / DELETE handlers trusted the
// client's `userId` so any logged-in user could read, create, or
// bulk-delete trades belonging to any other user.

// Get trades for the authenticated user.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const simulated = req.nextUrl.searchParams.get("simulated");
  const month = req.nextUrl.searchParams.get("month");
  const year = req.nextUrl.searchParams.get("year");

  try {
    const query: Record<string, unknown> = {
      userID: new mongoose.Types.ObjectId(session.user.id),
    };

    if (simulated === "true") query.simulated = true;
    if (simulated === "false") query.simulated = false;

    const proUser = await User.findById(session.user.id)
      .select("isPro")
      .lean<{ isPro?: boolean }>();
    const isPro = !!proUser?.isPro;

    if (!isPro) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - FREE_HISTORY_DAYS);
      // A trade is in-window if any of its attribution dates falls
      // within the cap. Matches what users see on the calendar.
      const recencyClauses = [
        { dateClosed: { $gte: cutoff } },
        { dateBought: { $gte: cutoff } },
      ];
      query.$and = [{ $or: recencyClauses }];
    }

    if (month && year) {
      const m = Number(month);
      const y = Number(year);

      const startDate = new Date(y, m, 1);
      const endDate = new Date(y, m + 1, 0, 23, 59, 59);

      // Closed trades attribute to their EXIT month (matches broker P/L
      // accounting). Open trades attribute to their ENTRY month. Closed
      // trades with no dateClosed fall back to dateBought.
      const monthClauses = [
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
      // If the recency cap is already on query.$and, fold the month
      // window in as another $and clause so both filters apply.
      const existingAnd = Array.isArray(query.$and) ? query.$and : [];
      query.$and = [...existingAnd, { $or: monthClauses }];
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

// Add a new trade for the authenticated user. The userID field on the
// body is overwritten so a request can't create a trade owned by
// someone else.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  try {
    const body = await req.json();
    const trade = await Trade.create({
      ...body,
      userID: new mongoose.Types.ObjectId(session.user.id),
    });
    return NextResponse.json(trade, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create trade";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Bulk-delete the authenticated user's trades (optionally scoped to
// real vs. simulated). The previous version read userId from the
// request body so any caller could wipe any account's history.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  try {
    const { simulated }: { simulated?: boolean } = await req
      .json()
      .catch(() => ({}));

    const filter: Record<string, unknown> = {
      userID: new mongoose.Types.ObjectId(session.user.id),
    };

    if (simulated === true) {
      filter.simulated = true;
    } else if (simulated === false) {
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
