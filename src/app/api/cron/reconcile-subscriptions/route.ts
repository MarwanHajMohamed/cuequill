import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripeSync";

// Nightly backstop for the Stripe webhook. Webhooks can be missed
// (endpoint down, mis-signed secret, dropped delivery), and isPro is only
// ever turned OFF by a webhook — so without this, a cancelled or
// non-paying subscriber could keep Pro indefinitely. This job pulls each
// subscriber's LIVE status straight from Stripe and re-syncs, self-healing
// any drift regardless of webhook delivery.
export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  // Vercel-signed cron header, kept as a fallback.
  if (req.headers.get("x-vercel-cron")) return true;
  return false;
}

// Stripe returns 404 / resource_missing when a subscription has been fully
// deleted and is no longer retrievable.
function isMissing(err: unknown): boolean {
  const e = err as { statusCode?: number; code?: string };
  return e?.statusCode === 404 || e?.code === "resource_missing";
}

async function runReconcile() {
  await connectDb();

  const users = await User.find({
    stripeSubscriptionId: { $exists: true, $nin: [null, ""] },
  }).select("_id stripeSubscriptionId proManualOverride isPro");

  const stripe = getStripe();
  const results = { checked: 0, resynced: 0, dropped: 0, errors: 0 };

  for (const user of users) {
    results.checked += 1;
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      // syncSubscriptionToUser re-derives isPro from the live status and
      // saves — the single source of truth used by the webhook too.
      await syncSubscriptionToUser(sub);
      results.resynced += 1;
    } catch (err) {
      if (isMissing(err)) {
        // Subscription is gone entirely — drop to comp-only access.
        user.isPro = !!user.proManualOverride;
        user.stripeSubscriptionStatus = "canceled";
        user.stripeCancelAtPeriodEnd = false;
        await user.save();
        results.dropped += 1;
      } else {
        // Transient Stripe/DB error — leave this user's state untouched
        // and let the next run retry.
        results.errors += 1;
        console.error(
          "[cron/reconcile-subscriptions]",
          user._id.toString(),
          err,
        );
      }
    }
  }

  return results;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runReconcile();
  console.log("[cron/reconcile-subscriptions]", JSON.stringify(result));
  return NextResponse.json(result);
}

// Mirror GET so QStash (or any caller) can POST too.
export async function POST(req: Request) {
  return GET(req);
}
