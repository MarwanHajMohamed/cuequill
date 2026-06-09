import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

// Resolve the authenticated user's id, the requested trade id, and the
// existing Trade doc — and short-circuit with the right HTTP error if
// the user isn't logged in, the trade doesn't exist, or the trade
// belongs to someone else. Centralized so GET / PATCH / DELETE all
// enforce the same ownership boundary.
async function requireOwnedTrade(id: string): Promise<
  | { ok: true; trade: { _id: unknown; userID: unknown }; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  await connectDB();
  // Only select the fields needed for the ownership check — keeps the
  // payload lean and avoids leaking notes/etc. on a 403 path.
  const trade = await Trade.findById(id, { _id: 1, userID: 1 }).lean<{
    _id: unknown;
    userID: unknown;
  }>();
  if (!trade) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Trade not found" }, { status: 404 }),
    };
  }
  if (String(trade.userID) !== session.user.id) {
    // Return 404 instead of 403 so we don't reveal that a trade with
    // that id exists for another user.
    return {
      ok: false,
      response: NextResponse.json({ error: "Trade not found" }, { status: 404 }),
    };
  }
  return { ok: true, trade, userId: session.user.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireOwnedTrade(id);
  if (!guard.ok) return guard.response;

  // Ownership check already loaded a minimal doc; re-fetch the full
  // document for the response.
  const full = await Trade.findById(id).lean();
  if (!full) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }
  return NextResponse.json(full);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireOwnedTrade(id);
  if (!guard.ok) return guard.response;

  try {
    const data = await req.json();

    // Never let a request rewrite ownership.
    delete (data as Record<string, unknown>).userID;

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
  const guard = await requireOwnedTrade(id);
  if (!guard.ok) return guard.response;

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
