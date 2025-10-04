import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  const trade = await Trade.findById(id).lean();
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json(trade);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  try {
    const data = await req.json();

    if (typeof data.favourite !== "undefined") {
    }

    const updated = await Trade.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, upsert: false }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update trade", err },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  try {
    const deleted = await Trade.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Trade deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete trade", err },
      { status: 400 }
    );
  }
}
