"use client";

import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTheme } from "@/hooks/useTheme";

// In-app Pro upgrade - no redirect to Stripe's hosted Checkout. The card is
// collected with Stripe Elements, a promo code can be applied, and the
// subscription is created + confirmed here. On success the caller decides
// where to go (usually /settings?checkout=success to reconcile + unlock).

export type UpgradeCycle = "monthly" | "annual";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

// Display prices (must match Stripe's configured prices).
const PRICES: Record<UpgradeCycle, { headline: string; sub: string }> = {
  monthly: { headline: "£39", sub: "per month" },
  annual: { headline: "£31", sub: "per month · billed £372/yr" },
};

function cardStyle(isLight: boolean) {
  return {
    hidePostalCode: true,
    style: {
      base: {
        color: isLight ? "#1f2937" : "#e5e7eb",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, "DM Mono", monospace',
        fontSize: "15px",
        "::placeholder": {
          color: isLight ? "rgba(31,41,55,0.4)" : "rgba(255,255,255,0.35)",
        },
        iconColor: isLight ? "#0d9488" : "#5eead4",
      },
      invalid: { color: "#ef4444", iconColor: "#ef4444" },
    },
  };
}

function UpgradeForm({
  initialCycle,
  onSuccess,
}: {
  initialCycle: UpgradeCycle;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [cycle, setCycle] = useState<UpgradeCycle>(initialCycle);
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<{ code: string; label: string } | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPromo = async () => {
    const code = promo.trim();
    if (!code || checkingPromo) return;
    setCheckingPromo(true);
    setPromoError(null);
    try {
      const r = await fetch("/api/stripe/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.valid) {
        setApplied({ code: d.code, label: d.label });
        setPromoError(null);
      } else {
        setApplied(null);
        setPromoError(d.error ?? "That code isn't valid.");
      }
    } catch {
      setPromoError("Couldn't check that code.");
    } finally {
      setCheckingPromo(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    setSubmitting(true);
    setError(null);

    try {
      const r = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle, promoCode: applied?.code }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Couldn't start the subscription.");
        setSubmitting(false);
        return;
      }
      if (d.noPaymentRequired) {
        onSuccess();
        return;
      }
      const { error: payErr } = await stripe.confirmCardPayment(d.clientSecret, {
        payment_method: { card: cardEl },
      });
      if (payErr) {
        setError(payErr.message ?? "Your card couldn't be charged.");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const price = PRICES[cycle];

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Cycle toggle */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.03] self-start">
        {(["annual", "monthly"] as UpgradeCycle[]).map((c) => {
          const on = cycle === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition cursor-pointer ${
                on ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white/80"
              }`}
            >
              {c === "annual" ? "Annual · save 20%" : "Monthly"}
            </button>
          );
        })}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-[30px] font-semibold tracking-tight text-white">
          {price.headline}
        </span>
        <span className="text-[12.5px] text-white/50">{price.sub}</span>
      </div>

      {/* Promo */}
      <div>
        <div className="flex items-center gap-2">
          <input
            value={promo}
            onChange={(e) => {
              setPromo(e.target.value);
              setApplied(null);
              setPromoError(null);
            }}
            placeholder="Promo code"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-teal-400/40 transition uppercase"
          />
          <button
            type="button"
            onClick={applyPromo}
            disabled={!promo.trim() || checkingPromo}
            className="shrink-0 px-3.5 py-2.5 rounded-xl border border-white/12 bg-white/[0.03] text-white/80 hover:text-white hover:border-white/25 text-[12.5px] font-medium transition cursor-pointer disabled:opacity-50"
          >
            {checkingPromo ? "…" : "Apply"}
          </button>
        </div>
        {applied && (
          <div className="mt-1.5 text-[12px] text-teal-300 inline-flex items-center gap-1.5">
            <i className="fa-solid fa-circle-check text-[10px]" />
            {applied.code} applied — {applied.label}
          </div>
        )}
        {promoError && (
          <div className="mt-1.5 text-[12px] text-red-300 inline-flex items-center gap-1.5">
            <i className="fa-solid fa-triangle-exclamation text-[10px]" />
            {promoError}
          </div>
        )}
      </div>

      {/* Card */}
      <div>
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-1.5">
          Card details
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
          <CardElement options={cardStyle(isLight)} />
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-300 inline-flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#fff] text-[14px] font-semibold transition cursor-pointer disabled:opacity-60 shadow-[0_10px_40px_-10px_rgba(20,184,166,0.7)]"
      >
        {submitting && (
          <i className="fa-solid fa-circle-notch animate-spin text-[12px]" />
        )}
        {submitting ? "Processing…" : "Start Pro"}
      </button>
      <p className="text-[11px] text-white/40 text-center leading-relaxed">
        You can cancel any time. Secured by Stripe — your card details never
        touch our servers.
      </p>
    </form>
  );
}

export default function UpgradeModal({
  initialCycle = "annual",
  onClose,
  onSuccess,
}: {
  initialCycle?: UpgradeCycle;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] my-auto rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold flex items-center gap-2">
            <i className="fa-solid fa-crown text-[13px] text-teal-300" />
            Upgrade to Pro
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-[13px]" />
          </button>
        </div>
        {stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              appearance: { theme: theme === "light" ? "stripe" : "night" },
            }}
          >
            <UpgradeForm initialCycle={initialCycle} onSuccess={onSuccess} />
          </Elements>
        ) : (
          <div className="text-[12.5px] text-white/55">
            Upgrades aren&apos;t configured. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
}
