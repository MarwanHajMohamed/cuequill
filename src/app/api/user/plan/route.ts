import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const user = await User.findById(session.user.id)
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

  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  if (body.action !== "cancel") {
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

  // No Stripe subscription — a comped/legacy Pro. There's nothing to
  // cancel in Stripe, so just drop the local grant immediately.
  if (!user.stripeSubscriptionId) {
    user.isPro = false;
    user.proManualOverride = false;
    await user.save();
    return NextResponse.json({ ok: true, immediate: true });
  }

  const stripe = getStripe();
  const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

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
