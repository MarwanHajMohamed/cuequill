import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();

  const trade = await Trade.findById(context.params.id).lean();
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json(trade);
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const data = await req.json();
    const updated = await Trade.findByIdAndUpdate(context.params.id, data, { new: true }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update trade" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const deleted = await Trade.findByIdAndDelete(context.params.id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Trade deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 400 });
  }
}
