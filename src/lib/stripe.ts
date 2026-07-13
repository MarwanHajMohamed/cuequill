import Stripe from "stripe";

// Lazily constructed so importing this module never throws at build time
// when STRIPE_SECRET_KEY isn't present — the error only surfaces (as a
// clean 500) if a route actually tries to talk to Stripe without a key.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  _stripe = new Stripe(key, {
    // No apiVersion pin — use the account's default so an SDK bump
    // doesn't force a version mismatch.
    typescript: true,
    appInfo: { name: "Cuequill" },
  });
  return _stripe;
}

export type BillingCycle = "monthly" | "annual";

// Price IDs come from your Stripe dashboard (one recurring Price per
// cycle on the Pro product) and are injected via env so the same code
// runs against test and live modes.
export function priceIdForCycle(cycle: BillingCycle): string | null {
  const id =
    cycle === "annual"
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;
  return id && id.trim() ? id.trim() : null;
}

// Subscription statuses that grant access. `trialing` is included for
// forward-compatibility even though trials are currently off.
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// Whether a raw Stripe subscription status should grant Pro access.
// `past_due` is intentionally kept as active for a short grace period —
// Stripe retries the payment, and yanking access on the first failed
// charge is hostile. It flips to `canceled`/`unpaid` if retries fail.
export function statusGrantsAccess(status: string | null | undefined): boolean {
  return !!status && ACTIVE_STATUSES.has(status);
}
