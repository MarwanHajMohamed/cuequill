import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { sendPush } from "@/lib/webPush";

// POST /api/push/test
// Sends a one-off test notification to all of the signed-in user's
// subscriptions. Used by the settings UI "Send test" button so the
// user can confirm push works on this device.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select("pushSubscriptions");
  const subs = user?.pushSubscriptions ?? [];
  if (subs.length === 0) {
    return NextResponse.json(
      { error: "No push subscriptions on this account" },
      { status: 400 },
    );
  }

  const gone: string[] = [];
  let delivered = 0;
  for (const sub of subs) {
    const r = await sendPush(
      { endpoint: sub.endpoint, keys: sub.keys },
      {
        title: "Cuequill",
        body: "Push notifications are working. ✓",
        url: "/dashboard",
        tag: "test",
      },
    );
    if (r.ok) delivered++;
    if (r.gone) gone.push(sub.endpoint);
  }
  if (gone.length > 0) {
    await User.updateOne(
      { _id: session.user.id },
      { $pull: { pushSubscriptions: { endpoint: { $in: gone } } } },
    );
  }

  return NextResponse.json({ delivered, pruned: gone.length });
}
