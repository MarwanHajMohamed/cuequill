import type Stripe from "stripe";
import { User } from "@/lib/models/User";
import { statusGrantsAccess } from "@/lib/stripe";

// Apply a Stripe subscription's current state onto the matching user.
// This is the ONLY place isPro is derived from billing, so the rule
// "effective Pro = manual comp OR active subscription" lives in one spot.
//
// The webhook calls this on every subscription lifecycle event; it's
// idempotent, so replays/duplicate deliveries are safe.
export async function syncSubscriptionToUser(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Prefer the customer-id link (set when we created the customer);
  // fall back to the userId we stamp into subscription metadata in case
  // an event arrives before that link was persisted.
  const user =
    (await User.findOne({ stripeCustomerId: customerId })) ??
    (sub.metadata?.userId ? await User.findById(sub.metadata.userId) : null);
  if (!user) return;

  // `current_period_end` moved from the subscription to its items in
  // newer Stripe API versions; read defensively from either so we don't
  // couple to a single pinned version.
  const subEnd = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const itemEnd = (
    sub.items?.data?.[0] as unknown as { current_period_end?: number }
  )?.current_period_end;
  const periodEndUnix = subEnd ?? itemEnd;

  const active = statusGrantsAccess(sub.status);

  user.stripeCustomerId = customerId;
  user.stripeSubscriptionId = sub.id;
  user.stripeSubscriptionStatus = sub.status;
  user.stripePriceId = sub.items?.data?.[0]?.price?.id;
  user.stripeCancelAtPeriodEnd = !!sub.cancel_at_period_end;
  if (periodEndUnix) {
    user.stripeCurrentPeriodEnd = new Date(periodEndUnix * 1000);
  }
  // Manual comps survive a lapsed/absent subscription.
  user.isPro = !!user.proManualOverride || active;

  await user.save();
}
