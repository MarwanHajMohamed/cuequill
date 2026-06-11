import connectDb from "@/lib/db";
import Rule from "@/lib/models/Rule";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  const { id } = await params;

  try {
    const data = await req.json();
    const updated = await Rule.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDb();
  try {
    const deleted = await Rule.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Rule deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete rule", err },
      { status: 400 }
    );
  }
}
