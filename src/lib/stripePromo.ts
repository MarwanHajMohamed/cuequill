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

function labelFromCoupon(c: CouponLike | null | undefined): string {
  if (!c) return "Discount applied";
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
  const wanted = code.toUpperCase();

  // 1) Customer-facing promotion code. Try the exact-code filter first, then
  //    scan active codes and match case-insensitively (the filter's casing
  //    behaviour isn't something to rely on).
  try {
    let pc: Stripe.PromotionCode | null =
      (await stripe.promotionCodes.list({ code, active: true, limit: 1 }))
        .data[0] ?? null;
    if (!pc) {
      const all = await stripe.promotionCodes.list({ active: true, limit: 100 });
      pc = all.data.find((p) => (p.code ?? "").toUpperCase() === wanted) ?? null;
    }
    if (pc) {
      // The promo code's coupon may come back as a full object, as a bare id
      // string, or not at all depending on the API version - normalise it so
      // the label never crashes and stays accurate when possible.
      const rawCoupon = (pc as unknown as { coupon?: unknown }).coupon;
      let coupon: CouponLike | undefined;
      if (rawCoupon && typeof rawCoupon === "object") {
        coupon = rawCoupon as CouponLike;
      } else if (typeof rawCoupon === "string") {
        coupon = (await stripe.coupons
          .retrieve(rawCoupon)
          .catch(() => undefined)) as unknown as CouponLike | undefined;
      }
      return {
        discount: { promotion_code: pc.id },
        label: labelFromCoupon(coupon),
        code: pc.code,
      };
    }
  } catch (err) {
    console.error("[promo] promotion-code lookup failed", err);
  }

  // 2) A coupon id directly (try as typed and uppercased - ids are exact).
  for (const id of Array.from(new Set([code, wanted]))) {
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

  console.warn(`[promo] no active promotion code or coupon matched "${code}"`);
  return null;
}
