import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-app billing data that replaces the Stripe billing portal: the card on
// file and the customer's invoice history (each with links to Stripe's
// generated invoice PDF / receipt). Read-only; changes go through the
// setup-intent / payment-method / plan routes.

export type BillingCard = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
} | null;

export type BillingInvoice = {
  id: string;
  number: string | null;
  created: string; // ISO
  amount: number; // major units (e.g. dollars)
  currency: string; // uppercased
  status: string; // paid, open, void, uncollectible, draft
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

function cardFrom(pm: Stripe.PaymentMethod | null | undefined): BillingCard {
  const c = pm?.card;
  if (!c) return null;
  return {
    brand: c.brand,
    last4: c.last4,
    expMonth: c.exp_month,
    expYear: c.exp_year,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id)
    .select("stripeCustomerId")
    .lean<{ stripeCustomerId?: string }>();

  const customerId = user?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ card: null, invoices: [] });
  }

  const stripe = getStripe();

  // Card on file: prefer the customer's default invoice payment method,
  // otherwise the most recent saved card.
  let card: BillingCard = null;
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (!("deleted" in customer && customer.deleted)) {
      const dpm = (customer as Stripe.Customer).invoice_settings
        ?.default_payment_method;
      if (dpm && typeof dpm !== "string") {
        card = cardFrom(dpm as Stripe.PaymentMethod);
      }
    }
    if (!card) {
      const pms = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      card = cardFrom(pms.data[0]);
    }
  } catch (err) {
    console.error("[stripe/billing] card lookup failed", err);
  }

  // Invoice history, newest first.
  let invoices: BillingInvoice[] = [];
  try {
    const list = await stripe.invoices.list({ customer: customerId, limit: 24 });
    invoices = list.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      created: new Date((inv.created ?? 0) * 1000).toISOString(),
      // amount_paid for settled invoices, else what's/was due.
      amount:
        ((inv.status === "paid" ? inv.amount_paid : inv.amount_due) ?? 0) / 100,
      currency: (inv.currency ?? "usd").toUpperCase(),
      status: inv.status ?? "draft",
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
    }));
  } catch (err) {
    console.error("[stripe/billing] invoice list failed", err);
  }

  return NextResponse.json({ card, invoices });
}
