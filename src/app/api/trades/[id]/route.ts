import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

// GET one trade
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const trade = await Trade.findById(params.id);
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }
  return NextResponse.json(trade);
}

// PATCH (partial update)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  try {
    const data = await req.json();
    const updated = await Trade.findByIdAndUpdate(params.id, data, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update trade" }, { status: 400 });
  }
}

// DELETE a trade
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  try {
    const deleted = await Trade.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Trade deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 400 });
  }
}
