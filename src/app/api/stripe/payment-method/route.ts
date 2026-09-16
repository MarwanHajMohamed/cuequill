import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Makes a just-saved card (from the SetupIntent flow) the customer's default
// for future invoices, and points every active subscription at it. Replaces
// the portal's default-card management.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    paymentMethodId?: unknown;
  };
  const pmId =
    typeof body.paymentMethodId === "string" ? body.paymentMethodId : "";
  if (!pmId) {
    return NextResponse.json(
      { error: "Missing payment method." },
      { status: 400 },
    );
  }

  await connectDb();
  const user = await User.findById(session.user.id)
    .select("stripeCustomerId")
    .lean<{ stripeCustomerId?: string }>();
  const customerId = user?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account." },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  // The SetupIntent attaches the PM to the customer; verify ownership before
  // trusting a client-supplied id.
  const pm = await stripe.paymentMethods.retrieve(pmId);
  if (pm.customer !== customerId) {
    return NextResponse.json(
      { error: "That card isn't on your account." },
      { status: 403 },
    );
  }

  // Default for future invoices.
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pmId },
  });

  // Point active subscriptions at the new card too, so renewals use it.
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    const LIVE = new Set(["active", "trialing", "past_due", "unpaid"]);
    for (const s of subs.data) {
      if (LIVE.has(s.status)) {
        await stripe.subscriptions.update(s.id, {
          default_payment_method: pmId,
        });
      }
    }
  } catch (err) {
    console.error("[stripe/payment-method] subscription update failed", err);
  }

  const card = pm.card
    ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      }
    : null;

  return NextResponse.json({ ok: true, card });
}
