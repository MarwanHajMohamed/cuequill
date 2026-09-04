import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe, priceIdForCycle } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripeSync";
import { getProStatus } from "@/lib/pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plan management, backed by Stripe.
//
// GET  → current plan state for the settings panel (status, renewal /
//        cancellation date, billing cycle).
// POST { action: "cancel" } → cancels the Stripe subscription at period
//        end, so the user keeps the access they've paid for until the
//        term runs out. The webhook remains the source of truth for
//        isPro; this route just kicks off the cancellation and mirrors
//        the resulting state locally.

type PlanFields = {
  isPro?: boolean;
  proManualOverride?: boolean;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: Date;
  stripeCancelAtPeriodEnd?: boolean;
};

function cycleForPrice(priceId?: string): "monthly" | "annual" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return "annual";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}

export async function GET() {
  // getProStatus reconciles live from Stripe (both directions - a missed
  // upgrade OR a missed cancellation), so opening the plan panel always
  // reflects the true billing state. force: skip the throttle since this is
  // an explicit user action. It also gives us the authenticated id.
  const { userId } = await getProStatus({ force: true });
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const user = await User.findById(userId)
    .select(
      "isPro proManualOverride stripeSubscriptionId stripeSubscriptionStatus stripePriceId stripeCurrentPeriodEnd stripeCancelAtPeriodEnd",
    )
    .lean<PlanFields>();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    isPro: !!user.isPro,
    manualComp: !!user.proManualOverride,
    hasSubscription: !!user.stripeSubscriptionId,
    status: user.stripeSubscriptionStatus ?? null,
    cycle: cycleForPrice(user.stripePriceId),
    currentPeriodEnd: user.stripeCurrentPeriodEnd
      ? new Date(user.stripeCurrentPeriodEnd).toISOString()
      : null,
    cancelAtPeriodEnd: !!user.stripeCancelAtPeriodEnd,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: unknown;
    cycle?: unknown;
  };
  if (body.action !== "cancel" && body.action !== "finalize-switch") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  // Finalize a cycle switch. The user returned from a Checkout that created
  // a new (annual) subscription; keep that one and cancel any other active
  // subscription (the old monthly) so they're never billed on two plans.
  // Runs on return from Checkout; the webhook does the same when it's wired,
  // so whichever fires first cleans up. Does NOT require isPro - the DB may
  // not have caught up to the just-paid subscription yet.
  if (body.action === "finalize-switch") {
    if (user.stripeCustomerId) {
      try {
        const list = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "all",
          limit: 20,
        });
        const ACTIVE = new Set(["active", "trialing", "past_due"]);
        const activeSubs = list.data
          .filter((s) => ACTIVE.has(s.status))
          .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
        // Keep the annual subscription (newest, since Checkout just made
        // it); fall back to the newest active if the price doesn't match.
        const annualPrice = priceIdForCycle("annual");
        const keep =
          activeSubs.find(
            (s) => s.items?.data?.[0]?.price?.id === annualPrice,
          ) ??
          activeSubs[0] ??
          null;
        for (const s of activeSubs) {
          if (keep && s.id !== keep.id) {
            try {
              await stripe.subscriptions.cancel(s.id);
            } catch (e) {
              console.error("[plan/finalize-switch] cancel old failed", s.id, e);
            }
          }
        }
        if (keep) await syncSubscriptionToUser(keep);
      } catch (err) {
        console.error("[plan/finalize-switch] failed", err);
      }
    }
    const fresh = await User.findById(user._id)
      .select("isPro stripePriceId")
      .lean<{ isPro?: boolean; stripePriceId?: string }>();
    return NextResponse.json({
      ok: true,
      isPro: !!fresh?.isPro,
      cycle: cycleForPrice(fresh?.stripePriceId),
    });
  }

  // ── action === "cancel" ─────────────────────────────────────────────
  if (!user.isPro) {
    return NextResponse.json(
      { error: "You're not on the Pro plan." },
      { status: 400 },
    );
  }

  // Find the subscription to cancel. Prefer the stored id, but if the
  // webhook never landed it (so stripeSubscriptionId is empty) fall back to
  // looking it up from the customer - otherwise we'd drop access locally
  // while Stripe quietly renews and charges the card again.
  let subId: string | undefined = user.stripeSubscriptionId;
  if (!subId && user.stripeCustomerId) {
    try {
      const list = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 10,
      });
      const CANCELABLE = new Set([
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "incomplete",
      ]);
      const live = list.data.find((s) => CANCELABLE.has(s.status));
      subId = (live ?? list.data[0])?.id;
      if (subId) user.stripeSubscriptionId = subId;
    } catch (err) {
      console.error("[plan] subscription lookup failed", err);
    }
  }

  // Genuinely no Stripe subscription (comped / legacy Pro): nothing to
  // cancel in Stripe, so just drop the local grant.
  if (!subId) {
    user.isPro = false;
    user.proManualOverride = false;
    await user.save();
    return NextResponse.json({ ok: true, immediate: true });
  }

  // Cancel the renewal: the subscription stays active until the period ends,
  // then Stripe won't charge again. If Stripe rejects the update (e.g. the
  // subscription is already canceled/gone), drop access locally instead.
  let sub;
  try {
    sub = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    console.error("[plan/cancel] cancel_at_period_end failed", err);
    user.isPro = !!user.proManualOverride;
    user.stripeCancelAtPeriodEnd = false;
    await user.save();
    return NextResponse.json({ ok: true, immediate: true });
  }

  // Mirror locally for instant UI; the webhook will confirm and, at
  // period end, flip isPro when the subscription actually ends.
  user.stripeSubscriptionStatus = sub.status;
  user.stripeCancelAtPeriodEnd = true;
  const endUnix =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (sub.items?.data?.[0] as unknown as { current_period_end?: number })
      ?.current_period_end;
  if (endUnix) user.stripeCurrentPeriodEnd = new Date(endUnix * 1000);
  await user.save();

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: user.stripeCurrentPeriodEnd
      ? user.stripeCurrentPeriodEnd.toISOString()
      : null,
  });
}
