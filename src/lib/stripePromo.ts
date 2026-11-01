import type Stripe from "stripe";

// Resolve a user-entered code to a Stripe discount. Stripe has two things a
// code can be: a customer-facing Promotion Code (maps to a coupon) or a raw
// Coupon id. We accept either, so "LAUNCH26" works whether it was created as
// a promotion code or just a coupon.

export type ResolvedPromo = {
  discount: Stripe.SubscriptionCreateParams.Discount;
  label: string;
  code: string;
  // Normalised discount so the client can show the reduced price.
  percentOff: number | null;
  amountOff: number | null; // major units (e.g. pounds), not pennies
  currency: string | null;
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

function couponNumbers(c: CouponLike | null | undefined): {
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
} {
  return {
    percentOff: c?.percent_off ?? null,
    amountOff: c?.amount_off != null ? c.amount_off / 100 : null,
    currency: c?.currency ?? null,
  };
}

export async function resolvePromo(
  stripe: Stripe,
  raw: string,
): Promise<ResolvedPromo | null> {
  const code = raw.trim();
  if (!code) return null;
  const wanted = code.toUpperCase();

  // The discount can be modelled a few ways depending on the API version:
  //   - pc.coupon (older),
  //   - pc.promotion.coupon (newer "Promotions" API),
  //   - the coupon/promotion given as a bare id string, or with the amounts
  //     inlined on the object itself.
  // Dig a coupon-like out of any of those, retrieving by id when needed.
  const couponFromNode = async (
    node: unknown,
  ): Promise<CouponLike | undefined> => {
    if (!node) return undefined;
    if (typeof node === "string") {
      return (await stripe.coupons
        .retrieve(node)
        .catch(() => undefined)) as unknown as CouponLike | undefined;
    }
    if (typeof node === "object") {
      const o = node as Record<string, unknown> & CouponLike;
      if (o.percent_off != null || o.amount_off != null) return o; // coupon-like
      if ("coupon" in o) return couponFromNode(o.coupon); // e.g. promotion.coupon
      return undefined;
    }
    return undefined;
  };
  const couponFromPc = async (pc: unknown): Promise<CouponLike | undefined> => {
    const o = pc as { coupon?: unknown; promotion?: unknown };
    return (
      (await couponFromNode(o.coupon)) ?? (await couponFromNode(o.promotion))
    );
  };

  // 1) Customer-facing promotion code. Expand both the (legacy) coupon and the
  //    (newer) promotion.coupon so the amounts come back inlined; if a given
  //    expansion isn't allowed, retry plainer and resolve by id.
  try {
    const listPromos = async (params: Stripe.PromotionCodeListParams) => {
      for (const expand of [
        ["data.promotion.coupon", "data.coupon"],
        ["data.coupon"],
        undefined,
      ]) {
        try {
          return await stripe.promotionCodes.list(
            expand ? { ...params, expand } : params,
          );
        } catch {
          /* try a plainer expand set */
        }
      }
      return await stripe.promotionCodes.list(params);
    };

    let pc: Stripe.PromotionCode | null =
      (await listPromos({ code, active: true, limit: 1 })).data[0] ?? null;
    if (!pc) {
      const all = await listPromos({ active: true, limit: 100 });
      pc = all.data.find((p) => (p.code ?? "").toUpperCase() === wanted) ?? null;
    }
    if (pc) {
      let coupon = await couponFromPc(pc);
      if (!coupon) {
        // Retrieve the code on its own with the deeper expand.
        const full = await stripe.promotionCodes
          .retrieve(pc.id, { expand: ["promotion.coupon", "coupon"] })
          .catch(() =>
            stripe.promotionCodes.retrieve(pc!.id).catch(() => null),
          );
        if (full) coupon = await couponFromPc(full);
      }
      if (!coupon) {
        console.warn(
          "[promo] found code but no coupon amounts; pc keys:",
          Object.keys(pc as object),
        );
      }
      return {
        discount: { promotion_code: pc.id },
        label: labelFromCoupon(coupon),
        code: pc.code,
        ...couponNumbers(coupon),
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
          ...couponNumbers(coupon),
        };
      }
    } catch {
      /* not a coupon by this id - try the next form */
    }
  }

  console.warn(`[promo] no active promotion code or coupon matched "${code}"`);
  return null;
}
