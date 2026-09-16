import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  getStripe,
  priceIdForCycle,
  statusGrantsAccess,
  type BillingCycle,
} from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripeSync";
import { resolvePromo } from "@/lib/stripePromo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create the Pro subscription entirely in-app (no hosted Checkout). The
// subscription is created "incomplete", and its first invoice's PaymentIntent
// client secret is returned so the client (Stripe Elements) can confirm the
// card here. A promotion code, if valid, is applied as a discount. The card
// entered during confirmation is saved as the subscription's default.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    cycle?: unknown;
    promoCode?: unknown;
  };
  const cycle: BillingCycle = body.cycle === "monthly" ? "monthly" : "annual";
  const promoCode =
    typeof body.promoCode === "string" ? body.promoCode.trim() : "";
  const priceId = priceIdForCycle(cycle);
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing isn't configured for that plan." },
      { status: 500 },
    );
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  // Reuse / create the customer.
  let customerId = user.stripeCustomerId;
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

  // Don't let someone stack a second subscription.
  if (statusGrantsAccess(user.stripeSubscriptionStatus)) {
    return NextResponse.json(
      { error: "You're already subscribed.", alreadySubscribed: true },
      { status: 400 },
    );
  }
  try {
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    if (
      existing.data.some((s) =>
        ["active", "trialing", "past_due"].includes(s.status),
      )
    ) {
      return NextResponse.json(
        { error: "You're already subscribed.", alreadySubscribed: true },
        { status: 400 },
      );
    }
  } catch {
    /* non-fatal - the create below is still safe */
  }

  // Resolve the promo/coupon code to a discount, if one was supplied.
  let discounts: Stripe.SubscriptionCreateParams.Discount[] | undefined;
  if (promoCode) {
    const resolved = await resolvePromo(stripe, promoCode);
    if (!resolved) {
      return NextResponse.json(
        { error: "That promo code isn't valid." },
        { status: 400 },
      );
    }
    discounts = [resolved.discount];
  }

  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId: user._id.toString() },
      ...(discounts ? { discounts } : {}),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't start the subscription.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Mirror the new (incomplete) subscription so the account is linked even
  // before the payment confirms.
  await syncSubscriptionToUser(sub);

  const invoice = sub.latest_invoice as Stripe.Invoice | null;
  const pi = (
    invoice as unknown as { payment_intent?: Stripe.PaymentIntent | null }
  )?.payment_intent;
  const clientSecret = pi?.client_secret ?? null;

  // A 100%-off coupon can settle the first invoice with no payment, leaving
  // the subscription already active - nothing to confirm client-side.
  if (!clientSecret) {
    return NextResponse.json({
      subscriptionId: sub.id,
      noPaymentRequired: statusGrantsAccess(sub.status),
    });
  }

  return NextResponse.json({ subscriptionId: sub.id, clientSecret });
}
