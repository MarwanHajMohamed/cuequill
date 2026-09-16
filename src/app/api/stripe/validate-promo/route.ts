import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate a promotion code (e.g. LAUNCH26) so the in-app upgrade can show
// the discount before subscribing. Returns a human label describing the deal.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ valid: false });

  const stripe = getStripe();
  const list = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });
  const pc = list.data[0];
  if (!pc) {
    return NextResponse.json({ valid: false, error: "That code isn't valid." });
  }

  const c = (
    pc as unknown as {
      coupon: {
        percent_off?: number | null;
        amount_off?: number | null;
        currency?: string | null;
        duration?: string;
        duration_in_months?: number | null;
      };
    }
  ).coupon;
  const amount =
    c.percent_off != null
      ? `${c.percent_off}% off`
      : c.amount_off != null
        ? `${new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: (c.currency ?? "gbp").toUpperCase(),
          }).format(c.amount_off / 100)} off`
        : "Discount";
  const duration =
    c.duration === "repeating" && c.duration_in_months
      ? ` for ${c.duration_in_months} month${c.duration_in_months === 1 ? "" : "s"}`
      : c.duration === "once"
        ? " on your first payment"
        : "";

  return NextResponse.json({
    valid: true,
    code: pc.code,
    label: `${amount}${duration}`,
  });
}
