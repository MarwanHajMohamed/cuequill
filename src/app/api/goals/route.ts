import connectDb from "@/lib/db";
import Goal from "@/lib/models/Goal";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Get goals for each user
export async function GET(req: NextRequest) {
  await connectDb();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Build query
  const query: any = { userId };

  // Filter by month and year if provided
  if (month && year) {
    const startDate = new Date(Number(year), Number(month), 1);
    const endDate = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  try {
    const goals = await Goal.find(query).sort({ createdAt: -1 });

    return NextResponse.json(goals);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

// Add a new goal
export async function POST(req: NextRequest) {
  await connectDb();

  try {
    const body = await req.json();
    const goal = await Goal.create(body);
    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create goal";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
