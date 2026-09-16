"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { withAuth } from "@/lib/withAuth";
import { useTheme } from "@/hooks/useTheme";

// A dedicated, professional checkout page for Pro - no hosted Stripe redirect.
// Left: what Pro gets you. Right: plan, promo, card, and confirm - all in-app.

type Cycle = "monthly" | "annual";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

const PRICES: Record<Cycle, { perMonth: string; billed: string }> = {
  monthly: { perMonth: "£39", billed: "billed monthly" },
  annual: { perMonth: "£31", billed: "billed £372 yearly" },
};

const PRO_FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "fa-wand-magic-sparkles",
    title: "Quill AI over your trades",
    body: "Ask questions and get analysis across your entire journal.",
  },
  {
    icon: "fa-rotate",
    title: "Automatic IBKR morning sync",
    body: "Your fills imported and matched for you, every day.",
  },
  {
    icon: "fa-infinity",
    title: "Unlimited history & strategies",
    body: "No 90-day cap, no 3-strategy limit — keep it all.",
  },
  {
    icon: "fa-chart-simple",
    title: "Per-strategy & per-symbol stats",
    body: "See exactly what's working and where you leak.",
  },
  {
    icon: "fa-list-check",
    title: "Rules board & affirmations",
    body: "Hold yourself to your plan, every session.",
  },
  {
    icon: "fa-file-arrow-down",
    title: "Downloadable CSV reports",
    body: "Export your journal and stats whenever you need them.",
  },
];

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

function PaymentPanel({ initialCycle }: { initialCycle: Cycle }) {
  const stripe = useStripe();
  const elements = useElements();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [cycle, setCycle] = useState<Cycle>(initialCycle);
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
        window.location.href = "/checkout/success";
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
      window.location.href = "/checkout/success";
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const price = PRICES[cycle];

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 flex flex-col gap-5"
    >
      {/* Plan choice */}
      <div className="flex flex-col gap-2">
        {(["annual", "monthly"] as Cycle[]).map((c) => {
          const on = cycle === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                on
                  ? "border-teal-500/50 bg-teal-500/[0.08]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    on ? "border-teal-400" : "border-white/25"
                  }`}
                >
                  {on && (
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                  )}
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium">
                    {c === "annual" ? "Annual" : "Monthly"}
                  </span>
                  <span className="block text-[11.5px] text-white/45">
                    {c === "annual" ? "Save 20% — 2 months free" : "Flexible, cancel anytime"}
                  </span>
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[15px] font-semibold tabular-nums">
                  {PRICES[c].perMonth}
                  <span className="text-[11px] text-white/45 font-normal">
                    /mo
                  </span>
                </span>
              </span>
            </button>
          );
        })}
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
        {submitting ? "Processing…" : `Start Pro · ${price.perMonth}/mo`}
      </button>
      <p className="text-[11px] text-white/40 text-center leading-relaxed">
        {price.billed}. Cancel any time. Secured by Stripe — your card details
        never touch our servers.
      </p>
    </form>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const initialCycle: Cycle =
    params.get("cycle") === "monthly" ? "monthly" : "annual";
  const { theme } = useTheme();

  // Already Pro? Nothing to buy - send them to their plan.
  const isPro = !!session?.user?.isPro;
  useEffect(() => {
    if (isPro) router.replace("/settings");
  }, [isPro, router]);

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 40% at 82% 6%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1000px] px-5 md:px-8 pt-24 md:pt-16 flex flex-col">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-white/45 hover:text-white/80 transition mb-6 w-fit"
        >
          <i className="fa-solid fa-chevron-left text-[10px]" />
          Back to pricing
        </Link>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Left: the value */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-medium text-teal-300">
              <i className="fa-solid fa-crown text-[10px]" />
              Cuequill Pro
            </div>
            <h1 className="mt-4 text-[26px] md:text-[30px] font-semibold tracking-tight">
              Everything working for you, every morning
            </h1>
            <p className="mt-2 text-[14px] text-white/55 leading-relaxed">
              You keep the whole journal — Quill AI, auto-sync, unlimited
              history, and the deeper stats that show what&apos;s actually
              working.
            </p>

            <div className="mt-7 flex flex-col gap-4">
              {PRO_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-300 flex items-center justify-center">
                    <i className={`fa-solid ${f.icon} text-[13px]`} />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-medium">{f.title}</div>
                    <div className="text-[12.5px] text-white/50 leading-relaxed">
                      {f.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: the checkout */}
          <div className="md:sticky md:top-16">
            {stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{
                  appearance: {
                    theme: theme === "light" ? "stripe" : "night",
                  },
                }}
              >
                <PaymentPanel initialCycle={initialCycle} />
              </Elements>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-[13px] text-white/55">
                Upgrades aren&apos;t configured yet. Please contact support.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(CheckoutPage);
