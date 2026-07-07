import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

// Plan management. Cancellation is a flag flip today — real billing
// (Stripe) will replace the cancel handler with a call into the
// billing provider that returns a period-end date, at which point
// this route becomes the local mirror of that state.
//
// Upgrades are NOT handled here: Free users self-serve upgrade
// through the pricing page, which will eventually kick off a Stripe
// Checkout session. We deliberately don't accept `{action: "upgrade"}`
// so a compromised client can't grant itself Pro.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  if (body.action !== "cancel") {
    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400 },
    );
  }

  await connectDb();
  const user = await User.findById(session.user.id).select("isPro");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.isPro) {
    return NextResponse.json(
      { error: "You're not on the Pro plan." },
      { status: 400 },
    );
  }

  await User.findByIdAndUpdate(session.user.id, { isPro: false });
  return NextResponse.json({ ok: true, isPro: false });
}
