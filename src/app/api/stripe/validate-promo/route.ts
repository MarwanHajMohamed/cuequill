import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { resolvePromo } from "@/lib/stripePromo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate a promo/coupon code (e.g. LAUNCH26) so the checkout can show the
// discount before subscribing. Accepts either a promotion code or a coupon id.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ valid: false });

  const stripe = getStripe();
  const resolved = await resolvePromo(stripe, code);
  if (!resolved) {
    return NextResponse.json({ valid: false, error: "That code isn't valid." });
  }

  return NextResponse.json({
    valid: true,
    code: resolved.code,
    label: resolved.label,
    percentOff: resolved.percentOff,
    amountOff: resolved.amountOff,
    currency: resolved.currency,
  });
}
