import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe, priceIdForCycle } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cuequill.com";

// Switching billing cycle (e.g. monthly → annual) goes through a hosted
// Stripe Checkout so the user explicitly confirms/authorises the payment,
// rather than silently charging the card on file. Checkout creates a NEW
// subscription on the chosen price; the previous one is cancelled once this
// is paid (see the webhook + /api/user/plan "finalize-switch"). We stamp the
// old subscription id into metadata so the cleanup knows what to cancel.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cycle = body.cycle === "monthly" ? "monthly" : "annual";
  const priceId = priceIdForCycle(cycle);
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing is not configured for that plan." },
      { status: 500 },
    );
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  // They should already be a paying subscriber to be switching cycles.
  const customerId = user.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account yet. Subscribe first." },
      { status: 400 },
    );
  }

  // The subscription we'll cancel once the new one is paid. Prefer the
  // stored id; fall back to the customer's current subscription.
  let switchFrom = user.stripeSubscriptionId;
  if (!switchFrom) {
    try {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      const live = list.data.find((s) =>
        ["active", "trialing", "past_due"].includes(s.status),
      );
      switchFrom = live?.id;
    } catch (err) {
      console.error("[switch-checkout] lookup failed", err);
    }
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user._id.toString(),
    subscription_data: { metadata: { userId: user._id.toString() } },
    // Session metadata drives the post-payment cleanup of the old plan.
    metadata: {
      userId: user._id.toString(),
      switchTo: cycle,
      switchFrom: switchFrom ?? "",
    },
    success_url: `${APP_URL}/settings?switch=success`,
    cancel_url: `${APP_URL}/settings?switch=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
