"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChatUsage } from "@/hooks/useChatUsage";
import BillingCardModal from "./BillingCardModal";
import CancelProModal from "./CancelProModal";
import type {
  BillingCard,
  BillingInvoice,
} from "@/app/api/stripe/billing/route";

// Current plan + upgrade/manage controls, backed by Stripe. Upgrading is a
// single prominent tap; cancelling lives quietly at the bottom behind a
// multi-step retention flow (CancelProModal). All billing management -
// card on file, invoices, resume - is native (no Stripe portal).

type PlanInfo = {
  isPro: boolean;
  manualComp: boolean;
  hasSubscription: boolean;
  status: string | null;
  cycle: "monthly" | "annual" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

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
          {format(used)} <span className="text-white/40">/ {format(limit)}</span>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-3">
      {children}
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
  const isPro = plan?.isPro ?? !!session?.user?.isPro;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [justCancelled, setJustCancelled] = useState(false);

  // In-app billing (replaces the Stripe portal): card on file + invoices.
  const [card, setCard] = useState<BillingCard>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [cardSecret, setCardSecret] = useState<string | null>(null);
  const [openingCard, setOpeningCard] = useState(false);

  // Invoices open in a slide-over pane: the plan slides left, invoices come
  // in from the right. Two panes share one track; we sync the wrapper height
  // to whichever pane is showing so it grows/shrinks smoothly with the slide.
  const [showInvoices, setShowInvoices] = useState(false);
  const mainPaneRef = useRef<HTMLDivElement>(null);
  const invPaneRef = useRef<HTMLDivElement>(null);
  const [paneHeight, setPaneHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const measure = () => {
      const el = showInvoices ? invPaneRef.current : mainPaneRef.current;
      if (el) setPaneHeight(el.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (mainPaneRef.current) ro.observe(mainPaneRef.current);
    if (invPaneRef.current) ro.observe(invPaneRef.current);
    return () => ro.disconnect();
  }, [showInvoices, plan, invoices, card, usage, billingLoaded]);

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

  const loadBilling = useCallback(async () => {
    try {
      const r = await fetch("/api/stripe/billing", { cache: "no-store" });
      if (r.ok) {
        const d = (await r.json()) as {
          card: BillingCard;
          invoices: BillingInvoice[];
        };
        setCard(d.card);
        setInvoices(d.invoices ?? []);
      }
    } catch {
      // Non-fatal.
    } finally {
      setBillingLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (plan?.hasSubscription) loadBilling();
  }, [plan?.hasSubscription, loadBilling]);

  // The plan GET reconciles against Stripe (both directions). Refresh the
  // session once if the reconciled value disagrees with the session flag so
  // the badge / gates catch up without waiting for the periodic re-check.
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (refreshedRef.current || !plan) return;
    const sessionPro = !!session?.user?.isPro;
    if (plan.isPro !== sessionPro) {
      refreshedRef.current = true;
      update({ isPro: plan.isPro });
    }
  }, [plan, session?.user?.isPro, update]);

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const r = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setCancelError(d.error ?? "Couldn't cancel. Try again?");
        return;
      }
      setCancelOpen(false);
      if (d.immediate) {
        await update({ isPro: false });
        setJustCancelled(true);
      }
      await loadPlan();
    } catch {
      setCancelError("Network error. Try again?");
    } finally {
      setCancelling(false);
    }
  };

  // Switching cycle goes through hosted Checkout so the user authorises the
  // payment. Returns to /settings?switch=success, where we finalize.
  const switchToAnnual = async () => {
    if (switching) return;
    setSwitching(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/switch-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle: "annual" }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      setError(d.error ?? "Couldn't start the switch. Try again?");
      setSwitching(false);
    } catch {
      setError("Network error. Try again?");
      setSwitching(false);
    }
  };

  // Returning from the switch Checkout - finalize (cancel the old plan).
  const switchHandledRef = useRef(false);
  useEffect(() => {
    if (switchHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sw = params.get("switch");
    if (!sw) return;
    switchHandledRef.current = true;
    params.delete("switch");
    const qs = params.toString();
    window.history.replaceState({}, "", `/settings${qs ? `?${qs}` : ""}`);
    if (sw !== "success") return;
    (async () => {
      try {
        await fetch("/api/user/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "finalize-switch" }),
        });
      } catch {
        /* the reconcile on loadPlan below still corrects the state */
      }
      await loadPlan();
    })();
  }, [loadPlan]);

  // Returning from a fresh subscription Checkout - reconcile + refresh session
  // so Pro unlocks app-wide without a reload.
  const checkoutHandledRef = useRef(false);
  useEffect(() => {
    if (checkoutHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const co = params.get("checkout");
    if (!co) return;
    checkoutHandledRef.current = true;
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState({}, "", `/settings${qs ? `?${qs}` : ""}`);
    if (co !== "success") return;
    (async () => {
      await loadPlan();
      await update({ isPro: true });
    })();
  }, [loadPlan, update]);

  // Undo a scheduled cancellation in-app.
  const handleResume = async () => {
    if (resuming) return;
    setResuming(true);
    setError(null);
    try {
      const r = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Couldn't resume. Try again?");
        return;
      }
      await loadPlan();
    } catch {
      setError("Network error. Try again?");
    } finally {
      setResuming(false);
    }
  };

  // Open the native card-update modal.
  const openCardModal = async () => {
    if (openingCard) return;
    setOpeningCard(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.clientSecret) {
        setError(d.error ?? "Couldn't start the card update. Try again?");
        return;
      }
      setCardSecret(d.clientSecret as string);
    } catch {
      setError("Network error. Try again?");
    } finally {
      setOpeningCard(false);
    }
  };

  const scheduledCancel = !!plan?.cancelAtPeriodEnd;
  const periodEnd = fmtDate(plan?.currentPeriodEnd ?? null);
  const offerAnnual =
    isPro &&
    !!plan?.hasSubscription &&
    plan?.cycle === "monthly" &&
    !scheduledCancel;

  return (
    <div className="p-5 md:p-7 max-w-[760px]">
      {/* Render helpers (called, not mounted as components, so parent
          re-renders don't remount the subtree). */}
      <div className="relative">{isPro ? ProView() : FreeView()}</div>

      {cardSecret && (
        <BillingCardModal
          clientSecret={cardSecret}
          onClose={() => setCardSecret(null)}
          onSaved={() => {
            setCardSecret(null);
            loadBilling();
          }}
        />
      )}

      <CancelProModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        periodEnd={periodEnd}
        cycle={plan?.cycle ?? null}
        proFeatures={PRO_ADDS}
        offerAnnual={offerAnnual}
        onSwitchAnnual={switchToAnnual}
        switching={switching}
        onConfirmCancel={handleCancel}
        cancelling={cancelling}
        error={cancelError}
      />
    </div>
  );

  // ── Free tier: an unmissable upgrade hero ─────────────────────────────
  function FreeView() {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.12] via-white/[0.02] to-indigo-500/[0.08] p-6 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-teal-400/15 blur-3xl"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-white/70">
              <i className="fa-solid fa-user text-[10px]" />
              You&apos;re on Free
            </div>
            <h2 className="mt-4 text-[24px] md:text-[28px] font-semibold tracking-tight">
              Unlock the full journal with Pro
            </h2>
            <p className="mt-2 text-[14px] text-white/60 leading-relaxed max-w-md">
              Quill AI over your own trades, automatic IBKR sync, unlimited
              history and strategies, and deeper stats — everything working for
              you every morning.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#fff] text-[15px] font-semibold transition cursor-pointer shadow-[0_10px_40px_-10px_rgba(20,184,166,0.7)]"
            >
              <i className="fa-solid fa-crown text-[13px]" />
              Upgrade to Pro
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <SectionLabel>Your plan includes</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {INCLUDED_FREE.map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-[13px]">
                  <i className="fa-solid fa-check text-teal-300 text-[11px] mt-[3px]" />
                  <span className="text-white/85">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Pro adds</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {PRO_ADDS.map((f) => (
                <div
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-white/55"
                >
                  <i className="fa-solid fa-crown text-amber-300/70 text-[10px] mt-[4px]" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-[12px] text-red-300 inline-flex items-center gap-1.5">
            <i className="fa-solid fa-triangle-exclamation text-[10px]" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Pro tier: premium status, usage, billing; cancel tucked away ──────
  function ProView() {
    const cycleLabel = plan?.cycle
      ? plan.cycle === "annual"
        ? "Annual"
        : "Monthly"
      : "";
    const heroSub =
      scheduledCancel && periodEnd
        ? `Access until ${periodEnd}, then reverts to Free.`
        : plan?.hasSubscription && periodEnd
          ? `${cycleLabel ? `${cycleLabel} · ` : ""}Renews ${periodEnd}.`
          : "Full access to every Pro tool.";

    // The invoice list, rendered inside the slide-over pane.
    const invoiceTable =
      invoices.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
          {invoices.map((inv) => {
            const href = inv.invoicePdf ?? inv.hostedInvoiceUrl;
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-white/85 tabular-nums">
                    {fmtDate(inv.created)}
                  </div>
                  <div className="text-[11.5px] text-white/45 capitalize">
                    {inv.status}
                    {inv.number ? ` · ${inv.number}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[13px] text-white/85 tabular-nums">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: inv.currency,
                    }).format(inv.amount)}
                  </span>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/12 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/25 text-[12px] font-medium transition cursor-pointer"
                    >
                      <i className="fa-solid fa-download text-[10px]" />
                      Invoice
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-[12.5px] text-white/40">
          No invoices yet.
        </div>
      );

    return (
      <div
        className="overflow-hidden"
        style={{ height: paneHeight, transition: "height 0.32s ease" }}
      >
        <div
          className="flex w-[200%] transition-transform duration-300 ease-out"
          style={{
            transform: showInvoices ? "translateX(-50%)" : "translateX(0%)",
          }}
        >
          {/* Plan pane */}
          <div
            ref={mainPaneRef}
            aria-hidden={showInvoices}
            className="w-1/2 shrink-0 transition-opacity duration-300 ease-out"
            style={{ opacity: showInvoices ? 0 : 1 }}
          >
            <div className="flex flex-col gap-7">
              {/* Status header - clean and boxless */}
              <div>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-crown text-[22px] text-teal-300" />
                    <div>
                      <div className="text-[12px] text-white/50">
                        Cuequill membership
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[26px] leading-none font-semibold tracking-tight text-white">
                          Pro
                        </span>
                        {scheduledCancel && (
                          <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Ending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {scheduledCancel && (
                    <button
                      onClick={handleResume}
                      disabled={resuming}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#fff] text-[14px] font-semibold transition cursor-pointer disabled:opacity-60 shadow-[0_8px_30px_-8px_rgba(20,184,166,0.6)]"
                    >
                      {resuming && (
                        <i className="fa-solid fa-circle-notch animate-spin text-[11px]" />
                      )}
                      {resuming ? "Resuming…" : "Keep my Pro"}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[13px] text-white/60">
                  <i className="fa-regular fa-calendar text-[12px] text-white/40" />
                  <span>{heroSub}</span>
                </div>
              </div>

              {scheduledCancel && periodEnd && (
          <div className="border border-amber-500/25 bg-amber-500/[0.06] rounded-xl px-3.5 py-2.5 text-[12.5px] text-amber-200 flex items-start gap-2">
            <i className="fa-solid fa-circle-info text-[12px] mt-0.5" />
            <span>
              Your Pro plan ends on {periodEnd}. Hit “Keep my Pro” any time
              before then to stay — you won&apos;t be charged again to continue.
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

        {/* Quill AI usage */}
        {usage && (
          <div>
            <SectionLabel>Quill AI usage</SectionLabel>
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
                  {usage.bonusMessages === 1 ? "" : "s"} from challenges.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing details */}
        {plan?.hasSubscription && (
          <div>
            <SectionLabel>Billing</SectionLabel>
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
                    ? plan.status
                        .replace(/_/g, " ")
                        .replace(/^\w/, (c) => c.toUpperCase())
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

        {/* Payment method */}
        {plan?.hasSubscription && (
          <div>
            <SectionLabel>Payment method</SectionLabel>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70">
                  <i className="fa-solid fa-credit-card text-[13px]" />
                </div>
                <div className="min-w-0">
                  {card ? (
                    <>
                      <div className="text-[13px] text-white/85">
                        <span className="capitalize">{card.brand}</span> ••••{" "}
                        {card.last4}
                      </div>
                      <div className="text-[11.5px] text-white/45 tabular-nums">
                        Expires {String(card.expMonth).padStart(2, "0")}/
                        {card.expYear}
                      </div>
                    </>
                  ) : (
                    <div className="text-[12.5px] text-white/55">
                      {billingLoaded ? "No card on file" : "Loading…"}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={openCardModal}
                disabled={openingCard}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer disabled:opacity-50"
              >
                {openingCard && (
                  <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
                )}
                {card ? "Update card" : "Add card"}
              </button>
            </div>
          </div>
        )}

        {/* Invoices - opens the slide-over pane on the right. */}
        {plan?.hasSubscription && (
          <div>
            <SectionLabel>Invoices</SectionLabel>
            <button
              onClick={() => setShowInvoices(true)}
              disabled={invoices.length === 0}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              <span className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70">
                  <i className="fa-solid fa-receipt text-[13px]" />
                </span>
                <span>
                  <span className="block text-[13px] text-white/85">
                    Invoices &amp; receipts
                  </span>
                  <span className="block text-[11.5px] text-white/45">
                    {invoices.length > 0
                      ? `${invoices.length} on file`
                      : billingLoaded
                        ? "None yet"
                        : "Loading…"}
                  </span>
                </span>
              </span>
              <i className="fa-solid fa-chevron-right text-[12px] text-white/40" />
            </button>
          </div>
        )}

        {/* Annual-savings nudge for monthly subscribers */}
        {offerAnnual && (
          <div className="border border-teal-500/25 bg-teal-500/[0.06] rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[12.5px] text-teal-300 flex items-start gap-2">
              <i className="fa-solid fa-piggy-bank text-[12px] mt-0.5" />
              <span>You&apos;re on monthly — switch to annual and save 20%.</span>
            </div>
            <button
              onClick={switchToAnnual}
              disabled={switching}
              className="shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-500/30 hover:bg-teal-500/25 transition text-[12.5px] font-medium cursor-pointer disabled:opacity-50"
            >
              {switching && (
                <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
              )}
              {switching ? "Switching…" : "Switch to annual"}
            </button>
          </div>
        )}

        {/* Cancel - intentionally quiet, at the very bottom, behind a flow. */}
        {plan?.hasSubscription && !scheduledCancel && (
          <div className="pt-2 mt-1 border-t border-white/[0.06] flex justify-center">
            <button
              onClick={() => {
                setCancelError(null);
                setCancelOpen(true);
              }}
              className="text-[12px] text-white/35 hover:text-white/60 transition cursor-pointer py-1"
            >
              Cancel membership
            </button>
          </div>
        )}
            </div>
          </div>

          {/* Invoices slide-over pane */}
          <div
            ref={invPaneRef}
            aria-hidden={!showInvoices}
            className="w-1/2 shrink-0 transition-opacity duration-300 ease-out"
            style={{ opacity: showInvoices ? 1 : 0 }}
          >
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setShowInvoices(false)}
                className="inline-flex items-center gap-2 text-[13px] text-white/55 hover:text-white transition cursor-pointer w-fit"
              >
                <i className="fa-solid fa-chevron-left text-[11px]" />
                Back to plan
              </button>
              <div>
                <SectionLabel>Invoices</SectionLabel>
                {invoiceTable}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
