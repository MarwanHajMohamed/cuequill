"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { withAuth } from "@/lib/withAuth";

// Shown right after a successful in-app payment. It verifies the subscription
// (the plan GET reconciles live against Stripe, so the DB flips to Pro even if
// the webhook lags), then refreshes the session so Pro unlocks app-wide, and
// confirms it to the user.

// Confetti spokes that burst out from behind the tick. 16 spokes at
// alternating distances make a fuller, wider burst; per-spoke delay staggers
// it. angle / colour / travel distance (px) / delay (s).
const SPARK_COLORS = ["#2dd4bf", "#34d399", "#fbbf24", "#5eead4", "#6ee7b7"];
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  a: i * 22.5,
  c: SPARK_COLORS[i % SPARK_COLORS.length],
  dist: i % 2 === 0 ? -150 : -110,
  d: (i % 5) * 0.04,
}));

// Module-level so it survives remounts within a single page load. withAuth
// briefly renders a loading state while `update()` refreshes the session,
// which unmounts + remounts this page; a component ref would reset on that
// remount and re-run the verify → refresh → remount cycle forever. This flag
// resets naturally on the next full navigation to the page.
let verifiedOnce = false;

function CheckoutSuccessPage() {
  const { update } = useSession();
  const [verified, setVerified] = useState(verifiedOnce);

  useEffect(() => {
    if (verifiedOnce) {
      setVerified(true);
      return;
    }
    verifiedOnce = true;
    (async () => {
      try {
        // Force a live reconcile so the DB reflects the just-paid subscription.
        await fetch("/api/user/plan", { cache: "no-store" });
      } catch {
        /* the session refresh below still re-derives from the DB */
      }
      try {
        // Re-derive isPro from the DB onto the JWT (the callback ignores any
        // client-sent value), unlocking the navbar and every gate.
        await update({ isPro: true });
      } catch {
        /* non-fatal */
      }
      setVerified(true);
    })();
    // Run once per page load; `update` intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex justify-center min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 72%), radial-gradient(45% 45% at 82% 6%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 72%)",
        }}
      />

      <div className="w-full max-w-[440px] px-5 flex flex-col items-center text-center pt-[18vh] pb-24">
        {/* Animated success badge */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-teal-400/30 blur-2xl"
          />
          {verified ? (
            <div className="success-badge" aria-hidden>
              <span className="ring" />
              {SPARKS.map((s, i) => (
                <span
                  key={i}
                  className="spark"
                  style={
                    {
                      "--a": `${s.a}deg`,
                      "--dist": `${s.dist}px`,
                      background: s.c,
                      animationDelay: `${0.4 + s.d}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
              <div className="disc">
                <svg viewBox="0 0 52 52">
                  <path className="check-path" d="M14 27l7.5 7.5L38 18" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="relative w-[104px] h-[104px] rounded-full bg-teal-500/10 border border-teal-400/30 flex items-center justify-center">
              <i className="fa-solid fa-circle-notch animate-spin text-teal-300 text-[30px]" />
            </div>
          )}
        </div>

        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-medium text-teal-300">
          <i className="fa-solid fa-crown text-[10px]" />
          Cuequill Pro
        </div>

        <h1 className="mt-4 text-[26px] font-semibold tracking-tight">
          {verified ? "You're Pro." : "Verifying payment…"}
        </h1>
        <p className="mt-2 text-[14px] text-white/55 leading-relaxed">
          {verified
            ? "Payment verified. Welcome to Cuequill Pro."
            : "Confirming your subscription with Stripe. This only takes a moment."}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            href="/dashboard"
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#fff] text-[14px] font-semibold transition cursor-pointer shadow-[0_10px_40px_-10px_rgba(20,184,166,0.7)] ${
              verified ? "" : "opacity-60 pointer-events-none"
            }`}
          >
            <i className="fa-solid fa-arrow-right text-[12px]" />
            Go to your dashboard
          </Link>
          <Link
            href="/settings"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white text-[14px] font-medium transition cursor-pointer"
          >
            View plan
          </Link>
        </div>

        <p className="mt-6 text-[11.5px] text-white/40 leading-relaxed">
          A receipt is on its way to your email, and your invoices are always
          available under Settings → Plan.
        </p>
      </div>
    </div>
  );
}

export default withAuth(CheckoutSuccessPage);
