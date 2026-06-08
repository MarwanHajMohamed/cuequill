import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

// POST /api/push/unsubscribe
// Body: { endpoint }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await req.json().catch(() => ({}));
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await connectDb();
  await User.updateOne(
    { _id: session.user.id },
    { $pull: { pushSubscriptions: { endpoint } } },
  );

  return NextResponse.json({ success: true });
}
