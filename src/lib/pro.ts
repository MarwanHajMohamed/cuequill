import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripeSync";

// How often to re-verify a Stripe-linked account against Stripe. Bounds the
// self-heal so active subscribers aren't re-queried on every request.
const RECONCILE_THROTTLE_MS = 5 * 60 * 1000;

function isMissing(err: unknown): boolean {
  const e = err as { statusCode?: number; code?: string };
  return e?.statusCode === 404 || e?.code === "resource_missing";
}

// Reconcile a user's Pro status live from Stripe - the backstop for a
// dropped/misconfigured webhook, in BOTH directions: it flips isPro on when
// a subscription is active but the DB missed it, and off when a subscription
// was cancelled but the DB still says Pro. Manual comps (proManualOverride)
// always keep Pro. Returns the resulting isPro; best-effort - on an
// unexpected Stripe error we leave the DB as-is and report the stored value.
async function reconcileFromStripe(user: {
  _id: unknown;
  isPro?: boolean;
  proManualOverride?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): Promise<boolean> {
  try {
    const stripe = getStripe();
    let sub = null;
    try {
      if (user.stripeCustomerId) {
        // Choose the customer's CURRENT subscription, not the stored id -
        // that id can be stale (e.g. after a monthly→annual switch it still
        // points at the cancelled monthly sub, which would read as "not
        // Pro" even though an annual sub is active). Prefer an
        // access-granting sub, newest first; fall back to the most recent.
        const list = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "all",
          limit: 20,
        });
        const GRANTS = new Set(["active", "trialing", "past_due"]);
        const byNewest = [...list.data].sort(
          (a, b) => (b.created ?? 0) - (a.created ?? 0),
        );
        sub = byNewest.find((s) => GRANTS.has(s.status)) ?? byNewest[0] ?? null;
      } else if (user.stripeSubscriptionId) {
        sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      }
    } catch (err) {
      if (!isMissing(err)) throw err;
      // A deleted subscription reads as "no subscription" below.
    }

    if (sub) {
      // Writes isPro = manual override OR active, and mirrors the status.
      await syncSubscriptionToUser(sub);
    } else {
      // No live subscription in Stripe → not Pro unless comped.
      await User.findByIdAndUpdate(user._id, {
        $set: { isPro: !!user.proManualOverride },
      });
    }

    // Stamp the throttle regardless so the next request doesn't re-hit Stripe.
    await User.findByIdAndUpdate(user._id, { $set: { proSyncedAt: new Date() } });

    const fresh = await User.findById(user._id)
      .select("isPro")
      .lean<{ isPro?: boolean }>();
    return !!fresh?.isPro;
  } catch (err) {
    console.error("[pro] Stripe reconcile failed:", err);
    return !!user.isPro;
  }
}

// Server-side Pro check. Reads the live DB flag (so a session minted before
// an upgrade is honoured immediately). For any Stripe-linked account it also
// re-verifies against Stripe once per throttle window - self-healing both a
// missed upgrade webhook (access should be on) and a missed cancellation
// webhook (access should be off). Manual comps and free users (no Stripe
// customer) never touch Stripe here. Pass { force } to skip the throttle for
// an explicit user action (e.g. opening the billing panel).
export async function getProStatus(opts?: { force?: boolean }): Promise<{
  userId: string | null;
  isPro: boolean;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) return { userId: null, isPro: false };
  await connectDb();
  const user = await User.findById(userId)
    .select(
      "isPro proManualOverride stripeCustomerId stripeSubscriptionId proSyncedAt",
    )
    .lean<{
      _id: unknown;
      isPro?: boolean;
      proManualOverride?: boolean;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      proSyncedAt?: Date;
    }>();
  if (!user) return { userId, isPro: false };

  // Manual comps are always Pro and have no subscription to verify.
  if (user.proManualOverride) return { userId, isPro: true };

  const hasStripe = !!(user.stripeCustomerId || user.stripeSubscriptionId);
  const stale =
    !user.proSyncedAt ||
    Date.now() - new Date(user.proSyncedAt).getTime() > RECONCILE_THROTTLE_MS;

  if (hasStripe && (opts?.force || stale)) {
    const isPro = await reconcileFromStripe(user);
    return { userId, isPro };
  }

  return { userId, isPro: !!user.isPro };
}
