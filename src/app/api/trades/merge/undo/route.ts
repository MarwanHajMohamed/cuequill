import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Trade from "@/lib/models/Trade";

// Reverse of POST /api/trades/merge. The client hands back the
// snapshot the merge endpoint returned (the pre-merge trade docs) and
// the id of the merged replacement; we reinsert the originals and
// delete the merged doc. Ownership is verified on both sides so a
// caller can't restore someone else's data or delete a trade they
// don't own.

type UndoBody = { mergedId?: unknown; originals?: unknown };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const body = (await req.json().catch(() => ({}))) as UndoBody;
  const mergedId = typeof body.mergedId === "string" ? body.mergedId : "";
  const originals = Array.isArray(body.originals) ? body.originals : [];
  if (!mongoose.Types.ObjectId.isValid(mergedId)) {
    return NextResponse.json(
      { error: "Invalid merged trade id." },
      { status: 400 },
    );
  }
  if (originals.length < 2) {
    return NextResponse.json(
      { error: "Nothing to restore." },
      { status: 400 },
    );
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const merged = await Trade.findOne({ _id: mergedId, userID: userId });
  if (!merged) {
    return NextResponse.json(
      { error: "Merged trade not found or already reverted." },
      { status: 404 },
    );
  }

  // Force each restored doc onto this user so a tampered snapshot
  // can't create trades under another account.
  const docsToInsert = originals.map((o) => {
    const src = (o ?? {}) as Record<string, unknown>;
    return { ...src, userID: userId };
  });

  const inserted = await Trade.insertMany(docsToInsert);
  try {
    await Trade.deleteOne({ _id: mergedId, userID: userId });
  } catch (err) {
    // Delete the freshly-inserted originals to avoid a duplicate
    // state (originals restored + merged trade still present).
    await Trade.deleteMany({
      _id: { $in: inserted.map((d) => d._id) },
      userID: userId,
    });
    return NextResponse.json(
      {
        error: "Undo failed while removing the merged trade.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ restored: inserted.length }, { status: 200 });
}
