import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Goal from "@/lib/models/Goal";
import { NextRequest, NextResponse } from "next/server";

// Shared ownership guard for the per-goal PATCH and DELETE handlers.
// Loads a minimal Goal doc to verify the authenticated user actually
// owns it; returns 404 (not 403) on cross-user access so we don't
// reveal that a goal with that id exists.
async function requireOwnedGoal(id: string): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  await connectDb();
  const goal = await Goal.findById(id, { _id: 1, userId: 1 }).lean<{
    _id: unknown;
    userId: unknown;
  }>();
  if (!goal) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Goal not found" }, { status: 404 }),
    };
  }
  if (String(goal.userId) !== session.user.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Goal not found" }, { status: 404 }),
    };
  }
  return { ok: true, userId: session.user.id };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireOwnedGoal(id);
  if (!guard.ok) return guard.response;

  try {
    const data = await req.json();
    // Never let a request rewrite ownership.
    delete (data as Record<string, unknown>).userId;

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
  const guard = await requireOwnedGoal(id);
  if (!guard.ok) return guard.response;

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
