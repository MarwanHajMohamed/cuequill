import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cuequill.com";

// Opens the Stripe Billing Portal so the user can update card details,
// switch plans, or cancel — Stripe hosts the whole flow.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select("stripeCustomerId");
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account yet. Subscribe first." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/pricing`,
  });

  return NextResponse.json({ url: portal.url });
}
