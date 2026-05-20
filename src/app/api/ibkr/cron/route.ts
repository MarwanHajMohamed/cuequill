import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { syncForUser } from "@/lib/ibkrSync";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const users = await User.find({
    ibkrToken: { $exists: true, $ne: "" },
    ibkrQueryId: { $exists: true, $ne: "" },
  }).select("_id");

  const results: Array<{ userId: string; status: string; inserted?: number; error?: string }> = [];

  for (const user of users) {
    try {
      const result = await syncForUser(user._id.toString());
      results.push({ userId: user._id.toString(), status: "ok", inserted: result.inserted });
    } catch (err) {
      results.push({
        userId: user._id.toString(),
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
