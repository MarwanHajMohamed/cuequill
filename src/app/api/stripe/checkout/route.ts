import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe, priceIdForCycle, statusGrantsAccess } from "@/lib/stripe";
import type { BillingCycle } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cuequill.com";

// Starts a Stripe Checkout session for the Pro subscription and returns
// the hosted-checkout URL for the client to redirect to.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cycle: BillingCycle = body.cycle === "monthly" ? "monthly" : "annual";
  const priceId = priceIdForCycle(cycle);
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing is not configured. Missing Stripe price id." },
      { status: 500 },
    );
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  // Reuse the customer across checkouts so all subscriptions/invoices
  // live under one Stripe customer; create + persist on first purchase.
  let customerId: string | undefined = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstname ?? ""} ${user.surname ?? ""}`.trim() || undefined,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  // Already subscribed → don't let them buy a second subscription; send
  // them to the billing portal to manage the existing one instead.
  if (statusGrantsAccess(user.stripeSubscriptionStatus)) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/pricing`,
    });
    return NextResponse.json({ url: portal.url, alreadySubscribed: true });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user._id.toString(),
    // Stamp userId onto the subscription so the webhook can recover the
    // owner even if the customer-id link hasn't persisted yet.
    subscription_data: { metadata: { userId: user._id.toString() } },
    success_url: `${APP_URL}/pricing?checkout=success`,
    cancel_url: `${APP_URL}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
