import connectDb from "@/lib/db";
import Goal from "@/lib/models/Goal";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  const { id } = await params;

  try {
    const data = await req.json();

    const updatedGoal = await Goal.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json(updatedGoal, { status: 200 });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
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
    const deleted = await Goal.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Goal deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete goal", err },
      { status: 400 }
    );
  }
}
