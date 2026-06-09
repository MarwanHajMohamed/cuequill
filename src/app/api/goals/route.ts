import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Goal from "@/lib/models/Goal";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Both handlers derive the user from the next-auth session. Any
// userId the client puts in the query or POST body is ignored —
// previously a logged-in user could list or create goals scoped to
// any other user.

// Get goals for the authenticated user.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const day = searchParams.get("day");
  const period = searchParams.get("period") ?? "monthly";

  const query: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(session.user.id),
  };

  if (period === "daily") {
    query.period = "daily";
    if (day !== null && month !== null && year !== null) {
      const startDate = new Date(
        Number(year),
        Number(month),
        Number(day),
        0,
        0,
        0
      );
      const endDate = new Date(
        Number(year),
        Number(month),
        Number(day),
        23,
        59,
        59,
        999
      );
      query.createdAt = { $gte: startDate, $lte: endDate };
    }
  } else {
    // Treat missing/legacy period as monthly for backwards compatibility
    query.$or = [{ period: "monthly" }, { period: { $exists: false } }];
    if (month !== null && year !== null) {
      const startDate = new Date(Number(year), Number(month), 1);
      const endDate = new Date(
        Number(year),
        Number(month) + 1,
        0,
        23,
        59,
        59
      );
      query.createdAt = { $gte: startDate, $lte: endDate };
    }
  }

  try {
    const goals = await Goal.find(query).sort({ createdAt: -1 });

    return NextResponse.json(goals);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch goals";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Create a goal owned by the authenticated user. userId on the body
// is overwritten — a request can't create a goal owned by someone
// else.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();

  try {
    const body = await req.json();
    const goal = await Goal.create({
      ...body,
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create goal";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
