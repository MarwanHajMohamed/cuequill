import type Stripe from "stripe";

// Resolve a user-entered code to a Stripe discount. Stripe has two things a
// code can be: a customer-facing Promotion Code (maps to a coupon) or a raw
// Coupon id. We accept either, so "LAUNCH26" works whether it was created as
// a promotion code or just a coupon.

export type ResolvedPromo = {
  discount: Stripe.SubscriptionCreateParams.Discount;
  label: string;
  code: string;
};

type CouponLike = {
  percent_off?: number | null;
  amount_off?: number | null;
  currency?: string | null;
  duration?: string;
  duration_in_months?: number | null;
  valid?: boolean;
};

function labelFromCoupon(c: CouponLike): string {
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
  return `${amount}${duration}`;
}

export async function resolvePromo(
  stripe: Stripe,
  raw: string,
): Promise<ResolvedPromo | null> {
  const code = raw.trim();
  if (!code) return null;

  // 1) Customer-facing promotion code. Stripe's `code` filter is
  //    case-insensitive, so casing on entry doesn't matter here.
  try {
    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });
    const pc = list.data[0];
    if (pc) {
      const c = (pc as unknown as { coupon: CouponLike }).coupon;
      return {
        discount: { promotion_code: pc.id },
        label: labelFromCoupon(c),
        code: pc.code,
      };
    }
  } catch {
    /* fall through to coupon lookup */
  }

  // 2) A coupon id directly (try as typed and uppercased - ids are exact).
  for (const id of Array.from(new Set([code, code.toUpperCase()]))) {
    try {
      const coupon = (await stripe.coupons.retrieve(id)) as unknown as CouponLike & {
        id: string;
      };
      if (coupon && coupon.valid !== false) {
        return {
          discount: { coupon: coupon.id },
          label: labelFromCoupon(coupon),
          code: coupon.id,
        };
      }
    } catch {
      /* not a coupon by this id - try the next form */
    }
  }

  return null;
}
