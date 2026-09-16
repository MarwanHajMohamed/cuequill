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

// Native "update card" modal, replacing the Stripe billing portal's card
// management. The parent fetches a SetupIntent client secret; here we collect
// the card with Stripe Elements, confirm the SetupIntent (no charge), then
// hand the resulting payment-method id back so the server can make it the
// default. The card number never touches our servers - Elements tokenises it.

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

// CardElement renders in its own iframe, so it can't inherit the app's CSS -
// its colours must be passed explicitly and matched to the active theme, or
// the text is invisible (light-on-light) in light mode.
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

function CardForm({
  clientSecret,
  onClose,
  onSaved,
}: {
  clientSecret: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmErr, setupIntent } = await stripe.confirmCardSetup(
      clientSecret,
      { payment_method: { card } },
    );
    if (confirmErr) {
      setError(confirmErr.message ?? "Couldn't save that card.");
      setSubmitting(false);
      return;
    }
    const pm = setupIntent?.payment_method;
    const pmId = typeof pm === "string" ? pm : (pm?.id ?? "");
    if (!pmId) {
      setError("Couldn't confirm the card. Try again?");
      setSubmitting(false);
      return;
    }

    try {
      const r = await fetch("/api/stripe/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Couldn't set the card as default.");
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Try again?");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <CardElement options={cardStyle(isLight)} />
      </div>
      {error && (
        <div className="text-[12px] text-red-300 inline-flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-3.5 py-2 rounded-full border border-white/12 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/25 text-[13px] font-medium transition cursor-pointer disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-400 text-[#fff] text-[13px] font-semibold transition cursor-pointer disabled:opacity-60"
        >
          {submitting && (
            <i className="fa-solid fa-circle-notch animate-spin text-[11px]" />
          )}
          {submitting ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}

export default function BillingCardModal({
  clientSecret,
  onClose,
  onSaved,
}: {
  clientSecret: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold">Update card</h3>
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
            <CardForm
              clientSecret={clientSecret}
              onClose={onClose}
              onSaved={onSaved}
            />
          </Elements>
        ) : (
          <div className="text-[12.5px] text-white/55">
            Card updates aren&apos;t configured. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
}
