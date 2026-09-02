"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useChatUsage } from "@/hooks/useChatUsage";

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

// What each tier ships with - shown as a "your plan includes" list, with
// the Pro-only rows presented as an upsell to free users.
const INCLUDED_FREE = [
  "Unlimited manual trade logging",
  "Calendar with net P&L",
  "Up to 3 custom strategies",
  "Win rate, expectancy & core stats",
  "90 days of history",
];
const PRO_ADDS = [
  "Quill AI over your own trades",
  "Automatic IBKR morning sync",
  "Unlimited strategies & history",
  "Per-strategy & per-symbol stats",
  "Rules board & affirmations",
  "Downloadable CSV reports",
];

const compactNum = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// A labelled usage bar (used / limit) with the fill turning amber near
// the cap.
function Meter({
  label,
  used,
  limit,
  format = (n: number) => n.toLocaleString(),
}: {
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const near = pct >= 90;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="text-white/70">{label}</span>
        <span className="tabular-nums text-white/85">
          {format(used)}{" "}
          <span className="text-white/40">/ {format(limit)}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            near ? "bg-amber-400" : "bg-teal-400"
          }`}
          style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

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
  const { data: usage } = useChatUsage(!!session?.user?.isPro);

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
      // Non-fatal - the session flag still drives the basic Pro/Free UI.
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
        // Comped/legacy account - access ended now.
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
      return `Pro until ${periodEnd}. Won't renew after that.`;
    }
    if (plan?.hasSubscription && periodEnd) {
      const cyc = plan.cycle ? `${plan.cycle} · ` : "";
      return `${cyc}Renews ${periodEnd}.`;
    }
    return "Full access to Quill AI, auto-sync, and unlimited history.";
  })();

  return (
    <div className="p-5 md:p-7 flex flex-col md:flex-row gap-6 md:gap-8">
      {/* Left column: plan card, alerts, usage, billing, nudge */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
      <div>
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-1">
          Current plan
        </div>
        <div
          className={`mt-3 relative overflow-hidden rounded-2xl border p-5 ${
            isPro
              ? "border-teal-500/25 bg-gradient-to-br from-teal-500/[0.10] via-transparent to-indigo-500/[0.06]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          {isPro && (
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-teal-400/15 blur-3xl"
            />
          )}
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
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
              // Already scheduled to cancel - offer resume/card management
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
            until then - reactivate any time from “Manage billing”.
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

      {/* Quill AI usage - the fair-use counters, Pro-only. */}
      {isPro && usage && (
        <div>
          <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-3">
            Quill AI usage
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col gap-4">
            <Meter
              label="Messages today"
              used={usage.messagesToday}
              limit={usage.dailyLimit}
            />
            <Meter
              label="Tokens this month"
              used={usage.tokensThisMonth}
              limit={usage.monthlyTokenLimit}
              format={(n) => compactNum.format(n)}
            />
            {usage.bonusMessages > 0 && (
              <div className="inline-flex items-center gap-1.5 text-[12px] text-violet-300 bg-violet-500/10 border border-violet-500/25 rounded-full px-3 py-1 w-fit">
                <i className="fa-solid fa-gift text-[10px]" />
                {usage.bonusMessages} bonus message
                {usage.bonusMessages === 1 ? "" : "s"} from challenges - used
                once you hit the daily cap.
              </div>
            )}
            <div className="text-[11px] text-white/40 leading-relaxed">
              Daily messages reset at midnight UTC; the monthly token budget
              resets on the 1st. Each question includes your trade context, so
              tokens add up faster than message count.
            </div>
          </div>
        </div>
      )}

      {/* Billing details - only meaningful with a real Stripe subscription. */}
      {plan?.hasSubscription && (
        <div>
          <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-3">
            Billing
          </div>
          <dl className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
            {[
              [
                "Billing cycle",
                plan.cycle
                  ? plan.cycle === "annual"
                    ? "Annual"
                    : "Monthly"
                  : "-",
              ],
              [
                "Status",
                plan.status
                  ? plan.status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
                  : "-",
              ],
              [scheduledCancel ? "Ends on" : "Next renewal", periodEnd || "-"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <dt className="text-[12.5px] text-white/50">{label}</dt>
                <dd className="text-[13px] text-white/85 tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Annual-savings nudge for monthly subscribers. */}
      {isPro &&
        plan?.hasSubscription &&
        plan.cycle === "monthly" &&
        !scheduledCancel && (
          <div className="border border-teal-500/25 bg-teal-500/[0.06] rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[12.5px] text-teal-100 flex items-start gap-2">
              <i className="fa-solid fa-piggy-bank text-[12px] mt-0.5" />
              <span>
                You&apos;re on monthly billing - switch to annual and save 20%.
              </span>
            </div>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-500/30 hover:bg-teal-500/25 transition text-[12.5px] font-medium cursor-pointer disabled:opacity-50"
            >
              {portalLoading ? "Opening…" : "Switch to annual"}
            </button>
          </div>
        )}
      </div>

      {/* Separator - a horizontal rule on mobile, a full-height rule on
          desktop between the two columns. */}
      <div className="h-px w-full md:h-auto md:w-px bg-white/10 shrink-0" />

      {/* Right column: what's included on the current plan. */}
      <div className="md:w-[300px] shrink-0">
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-3">
          {isPro ? "Plan includes" : "What's included"}
        </div>
        <div className="flex flex-col gap-2.5">
          {(isPro ? [...INCLUDED_FREE, ...PRO_ADDS] : INCLUDED_FREE).map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-[13px]">
              <i className="fa-solid fa-check text-teal-300 text-[11px] mt-[3px]" />
              <span className="text-white/85">{f}</span>
            </div>
          ))}

          {!isPro && (
            <>
              <div className="h-px bg-white/10 my-1.5" />
              <div className="text-[11px] tracking-[0.08em] text-white/40 font-medium">
                Pro adds
              </div>
              {PRO_ADDS.map((f) => (
                <div
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-white/45"
                >
                  <i className="fa-solid fa-lock text-white/30 text-[10px] mt-[3px]" />
                  <span>{f}</span>
                </div>
              ))}
              <Link
                href="/pricing"
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer w-fit"
              >
                <i className="fa-solid fa-arrow-up text-[11px]" />
                Upgrade to Pro
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
