import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
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

// GET /api/account/export
// Returns a JSON file with all of the signed-in user's data (GDPR right of
// access / data portability). Sensitive auth fields (password hash, broker
// tokens) are stripped from the profile.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const uid = new mongoose.Types.ObjectId(session.user.id);

  const [profile, trades, transactions, goals, rules, strategies, chatConvos, convos, stocks] =
    await Promise.all([
      User.findById(uid)
        .select("-password -ibkrToken -ibkrQueryId")
        .lean(),
      Trade.find({ userID: uid }).lean(),
      Transaction.find({ userID: uid }).lean(),
      Goal.find({ userId: uid }).lean(),
      RulesBoard.findOne({ userId: uid }).lean(),
      Strategy.find({ userId: uid }).lean(),
      ChatConversation.find({ userId: uid }).lean(),
      Conversation.find({ userId: uid }).lean(),
      StockTable.find({ userId: uid }).lean(),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: profile,
    trades,
    transactions,
    goals,
    rules,
    strategies,
    conversations: [...chatConvos, ...convos],
    watchlists: stocks,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cuequill-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
