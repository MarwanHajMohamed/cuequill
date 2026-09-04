import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripeSync";

// How often to re-check Stripe for a paying-but-not-Pro user. Bounds the
// self-heal so a genuinely churned account (has a customer id, correctly
// not Pro) isn't re-queried on every request.
const RECONCILE_THROTTLE_MS = 5 * 60 * 1000;

// Self-heal a missed webhook: the user paid (has a Stripe customer) but the
// DB never flipped to Pro. Pull their live subscription from Stripe and
// re-sync it (which writes isPro). Returns the resulting isPro. Best-effort:
// on any Stripe error we leave the DB as-is and report the stored value.
async function reconcileFromStripe(user: {
  _id: unknown;
  proManualOverride?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): Promise<boolean> {
  try {
    const stripe = getStripe();
    let sub = null;
    if (user.stripeSubscriptionId) {
      sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    } else if (user.stripeCustomerId) {
      const list = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 1,
      });
      sub = list.data[0] ?? null;
    }
    if (sub) {
      // syncSubscriptionToUser writes isPro (= manual override OR active),
      // so read it back from that same rule.
      await syncSubscriptionToUser(sub);
    }
    // Stamp the throttle regardless, so a churned/no-sub account doesn't
    // re-hit Stripe every request.
    await User.findByIdAndUpdate(user._id, { $set: { proSyncedAt: new Date() } });
    const fresh = await User.findById(user._id)
      .select("isPro")
      .lean<{ isPro?: boolean }>();
    return !!fresh?.isPro;
  } catch (err) {
    console.error("[pro] Stripe reconcile failed:", err);
    return false;
  }
}

// Server-side Pro check. Reads the live DB flag so a session minted
// before an upgrade is honored immediately, and a Pro who later loses
// access can't keep firing gated endpoints from a stale JWT.
//
// If the DB says not-Pro but the user has a Stripe customer id (i.e. they
// paid), it reconciles live from Stripe once per throttle window - this
// self-heals a dropped/misconfigured webhook so a paying user isn't stuck
// without access. Free users (no customer id) never touch Stripe here.
export async function getProStatus(): Promise<{
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

  if (user.isPro) return { userId, isPro: true };

  // Not Pro in the DB. If they've paid before (have a customer id) and we
  // haven't reconciled recently, verify against Stripe to catch a missed
  // webhook.
  const stale =
    !user.proSyncedAt ||
    Date.now() - new Date(user.proSyncedAt).getTime() > RECONCILE_THROTTLE_MS;
  if (user.stripeCustomerId && stale) {
    const isPro = await reconcileFromStripe(user);
    return { userId, isPro };
  }

  return { userId, isPro: false };
}
