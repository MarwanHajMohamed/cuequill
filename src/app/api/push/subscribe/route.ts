import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

// POST /api/push/subscribe
// Body: { endpoint, keys: { p256dh, auth } }
// Idempotent — replaces any existing subscription with the same endpoint.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectDb();
  await User.updateOne(
    { _id: session.user.id },
    { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } },
  );
  await User.updateOne(
    { _id: session.user.id },
    {
      $push: {
        pushSubscriptions: {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
      },
    },
  );

  return NextResponse.json({ success: true });
}
