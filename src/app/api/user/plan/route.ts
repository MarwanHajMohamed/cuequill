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
  if (body.action !== "cancel" && body.action !== "switch") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.isPro) {
    return NextResponse.json(
      { error: "You're not on the Pro plan." },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  // Find the subscription. Prefer the stored id, but if the webhook never
  // landed it (so stripeSubscriptionId is empty) fall back to looking it up
  // from the customer - otherwise, on cancel, we'd drop access locally while
  // Stripe quietly renews and charges the card again.
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

  // Switch billing cycle (e.g. monthly → annual). Swaps the subscription's
  // price in place with proration, so the change is immediate and the
  // renewal moves to the new cycle - no Stripe portal round-trip.
  if (body.action === "switch") {
    const targetCycle = body.cycle === "monthly" ? "monthly" : "annual";
    const priceId = priceIdForCycle(targetCycle);
    if (!priceId) {
      return NextResponse.json(
        { error: "Billing is not configured for that plan." },
        { status: 500 },
      );
    }
    if (!subId) {
      return NextResponse.json(
        { error: "No active subscription to switch." },
        { status: 400 },
      );
    }
    let current;
    try {
      current = await stripe.subscriptions.retrieve(subId);
    } catch (err) {
      console.error("[plan/switch] retrieve failed", err);
      return NextResponse.json(
        { error: "Couldn't load your subscription. Try again?" },
        { status: 502 },
      );
    }
    const item = current.items?.data?.[0];
    if (!item?.id) {
      return NextResponse.json(
        { error: "Couldn't read your subscription. Try again?" },
        { status: 502 },
      );
    }
    // Already on the requested cycle - just re-sync and report success.
    if (item.price?.id !== priceId) {
      const updated = await stripe.subscriptions.update(subId, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "create_prorations",
        // Switching to a new cycle implies keeping the subscription.
        cancel_at_period_end: false,
      });
      await syncSubscriptionToUser(updated);
    } else {
      await syncSubscriptionToUser(current);
    }
    return NextResponse.json({ ok: true, cycle: targetCycle });
  }

  // ── From here: action === "cancel" ──────────────────────────────────
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
