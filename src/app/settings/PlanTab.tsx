"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

// Current plan + upgrade/cancel controls, backed by Stripe.
//
// Cancellation goes through /api/user/plan (which cancels the Stripe
// subscription at period end), so the user keeps the access they paid
// for until the term runs out. "Manage billing" opens the Stripe Billing
// Portal for card changes / resuming. On an immediate downgrade (a comped
// account with no subscription) we ask NextAuth to refresh so isPro flips
// in the UI without a reload.

type PlanInfo = {
  isPro: boolean;
  manualComp: boolean;
  hasSubscription: boolean;
  status: string | null;
  cycle: "monthly" | "annual" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function PlanTab() {
  const { data: session, update } = useSession();

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  // Fall back to the session flag until the detailed plan loads so the
  // panel isn't blank on first paint.
  const isPro = plan?.isPro ?? !!session?.user?.isPro;

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCancelled, setJustCancelled] = useState(false);

  const loadPlan = useCallback(async () => {
    try {
      const r = await fetch("/api/user/plan", { cache: "no-store" });
      if (r.ok) setPlan((await r.json()) as PlanInfo);
    } catch {
      // Non-fatal — the session flag still drives the basic Pro/Free UI.
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      const r = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Couldn't cancel. Try again?");
        return;
      }
      setConfirming(false);
      if (d.immediate) {
        // Comped/legacy account — access ended now.
        await update({ isPro: false });
        setJustCancelled(true);
      }
      // For a scheduled cancellation the user stays Pro until period end;
      // reloading the plan surfaces the "cancels on <date>" state.
      await loadPlan();
    } catch {
      setError("Network error. Try again?");
    } finally {
      setCancelling(false);
    }
  };

  const openPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      setError(d.error ?? "Couldn't open billing. Try again?");
    } catch {
      setError("Network error. Try again?");
    } finally {
      setPortalLoading(false);
    }
  };

  const scheduledCancel = !!plan?.cancelAtPeriodEnd;
  const periodEnd = fmtDate(plan?.currentPeriodEnd ?? null);

  const subline = (() => {
    if (!isPro) return "90 days of history and the core journal.";
    if (scheduledCancel && periodEnd) {
      return `Pro until ${periodEnd} — won't renew after that.`;
    }
    if (plan?.hasSubscription && periodEnd) {
      const cyc = plan.cycle ? `${plan.cycle} · ` : "";
      return `${cyc}Renews ${periodEnd}.`;
    }
    return "Full access to Quill AI, auto-sync, and unlimited history.";
  })();

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6 max-w-2xl">
      <div>
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-1">
          CURRENT PLAN
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                  isPro
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                    : "bg-white/[0.04] border-white/15 text-white/70"
                }`}
              >
                <i
                  className={`fa-solid ${
                    isPro ? "fa-crown" : "fa-user"
                  } text-[14px]`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[16px] font-semibold">
                    {isPro ? "Pro" : "Free"}
                  </div>
                  {scheduledCancel && (
                    <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Cancelling
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-white/55">{subline}</div>
              </div>
            </div>

            {!isPro ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
              >
                <i className="fa-solid fa-arrow-up text-[11px]" />
                Upgrade to Pro
              </Link>
            ) : scheduledCancel ? (
              // Already scheduled to cancel — offer resume/card management
              // via the Stripe portal instead of another cancel button.
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer disabled:opacity-50"
              >
                {portalLoading ? "Opening…" : "Manage billing"}
              </button>
            ) : confirming ? (
              <div className="flex items-center gap-1.5 text-[12.5px] text-white/75">
                <span>Cancel?</span>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={cancelling}
                  className="px-2.5 py-1 rounded-full text-white/70 hover:text-white hover:bg-white/[0.08] transition text-[12px] cursor-pointer"
                >
                  No
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition text-[12px] font-semibold cursor-pointer disabled:opacity-50"
                >
                  {cancelling && (
                    <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
                  )}
                  Yes
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer disabled:opacity-50"
                >
                  {portalLoading ? "Opening…" : "Manage billing"}
                </button>
                <button
                  onClick={() => {
                    setConfirming(true);
                    setJustCancelled(false);
                    setError(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
                >
                  Cancel Pro
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {scheduledCancel && periodEnd && (
        <div className="border border-amber-500/25 bg-amber-500/[0.06] rounded-xl px-3.5 py-2.5 text-[12.5px] text-amber-200 flex items-start gap-2">
          <i className="fa-solid fa-circle-info text-[12px] mt-0.5" />
          <span>
            Your Pro plan is set to end on {periodEnd}. You keep full access
            until then — reactivate any time from “Manage billing”.
          </span>
        </div>
      )}

      {justCancelled && (
        <div className="border border-teal-500/25 bg-teal-500/[0.06] rounded-xl px-3.5 py-2.5 text-[12.5px] text-teal-200 flex items-start gap-2">
          <i className="fa-solid fa-circle-check text-[12px] mt-0.5" />
          <span>You&apos;re back on the Free plan. Re-upgrade any time.</span>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-red-300 inline-flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />
          {error}
        </div>
      )}
    </div>
  );
}
