import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import { getStripe } from "@/lib/stripe";
import { User } from "@/lib/models/User";
import Trade from "@/lib/models/Trade";
import { Transaction } from "@/lib/models/Transaction";
import Goal from "@/lib/models/Goal";
import RulesBoard from "@/lib/models/RulesBoard";
import Strategy from "@/lib/models/Strategy";
import ChatConversation from "@/lib/models/ChatConversation";
import Conversation from "@/lib/models/Conversation";
import StockTable from "@/lib/models/StockTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/account
// Permanently deletes the signed-in user's account and ALL their data
// (GDPR right to erasure). Requires an explicit confirmation in the body so
// it can't fire by accident: { confirm: "DELETE" }. Any active Stripe
// subscription is cancelled immediately first.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirm?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body → fails the confirm check below */
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Confirmation required: send { "confirm": "DELETE" }.' },
      { status: 400 },
    );
  }

  await connectDb();
  const uid = new mongoose.Types.ObjectId(session.user.id);
  const user = await User.findById(uid).select("stripeSubscriptionId");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cancel any live Stripe subscription immediately so billing stops. Don't
  // let a Stripe hiccup block the erasure — log and continue.
  if (user.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      console.error(
        "[account/delete] Stripe cancel failed for",
        session.user.id,
        err,
      );
    }
  }

  // Remove every per-user document, then the account itself.
  await Promise.all([
    Trade.deleteMany({ userID: uid }),
    Transaction.deleteMany({ userID: uid }),
    Goal.deleteMany({ userId: uid }),
    RulesBoard.deleteMany({ userId: uid }),
    Strategy.deleteMany({ userId: uid }),
    ChatConversation.deleteMany({ userId: uid }),
    Conversation.deleteMany({ userId: uid }),
    StockTable.deleteMany({ userId: uid }),
  ]);
  await User.deleteOne({ _id: uid });

  return NextResponse.json({ ok: true });
}
