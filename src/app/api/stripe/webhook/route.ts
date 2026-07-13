import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import connectDb from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripeSync";

// Stripe calls this endpoint directly (no user session). Authenticity is
// established by verifying the signature against STRIPE_WEBHOOK_SECRET, so
// the raw request body is required — never parse it as JSON first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    await connectDb();

    switch (event.type) {
      // Fires the moment checkout completes. Pull the fresh subscription
      // and apply it so access flips on without waiting for the separate
      // subscription.created event.
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const subId =
            typeof s.subscription === "string"
              ? s.subscription
              : s.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionToUser(sub);
        }
        break;
      }
      // Every subscription lifecycle change (renewal, plan switch, card
      // failure, cancellation) lands here.
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionToUser(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Ignore unrelated events; returning 200 stops Stripe retrying.
        break;
    }
  } catch (err) {
    // A processing failure returns 500 so Stripe retries with backoff.
    console.error("[stripe/webhook]", event.type, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
