import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

// Get trades for each user
export async function GET(req: NextRequest) {
  await connectDB();

  const userId = req.nextUrl.searchParams.get("userId");

  try {
    const trades = userId
      ? await Trade.find({ userId }).sort({ dateBought: -1 })
      : await Trade.find().sort({ dateBought: -1 });

    return NextResponse.json(trades);
  } catch (err) {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create trade" }, { status: 400 });
  }
}

// Update trade
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();
  
    try {
      const data = await req.json();
      const updated = await Trade.findByIdAndUpdate(params.id, data, { new: true });
      return NextResponse.json(updated);
    } catch (err) {
      return NextResponse.json({ error: "Failed to update trade" }, { status: 400 });
    }
  }

// Delete trade
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();
  
    try {
      await Trade.findByIdAndDelete(params.id);
      return NextResponse.json({ message: "Trade deleted" });
    } catch (err) {
      return NextResponse.json({ error: "Failed to delete trade" }, { status: 400 });
    }
  }