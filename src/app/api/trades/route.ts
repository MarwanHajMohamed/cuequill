import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

// Get trades for each user
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();

  const userId = req.nextUrl.searchParams.get("userId");

  try {
    const trades = userId
      ? await Trade.find({ userID: new mongoose.Types.ObjectId(userId) }).sort({ dateBought: -1 })
      : await Trade.find().sort({ dateBought: -1 });  

    return NextResponse.json(trades);
  } catch (err) {
    console.error("Error fetching trades:", err);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
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