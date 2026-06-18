"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaqRow,
  SectionMark,
  SiteFooter,
  SiteHeader,
  Standfirst,
} from "../_marketing/Chrome";

// ─── Data ────────────────────────────────────────────────────────────

type Cycle = "monthly" | "annual";

type Plan = {
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  cta: string;
  href: string;
  featured?: boolean;
  // Features the tier ships with.
  included: string[];
  // Features the tier doesn't ship with - shown muted so the gap is
  // obvious at a glance. Pass an empty array to skip the section.
  excluded?: string[];
  // Optional leading line shown above `included` (e.g. "Everything in
  // Starter, plus").
  leadIn?: string;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For the journal you keep meaning to read.",
    monthly: 0,
    annual: 0,
    cta: "Start free",
    href: "/login",
    included: [
      "Manual trade logging, unlimited",
      "Calendar P&L, net of commissions",
      "Core stats & win rate",
      "Rules board & affirmations",
      "25 Quill AI credits / month",
      "Light & dark themes",
    ],
    excluded: [
      "IBKR Flex auto-sync",
      "Quill AI over your own trades",
      "Strategy & symbol analytics",
      "Equity curve & portfolio history",
      "Credit top-ups",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    tagline: "The whole thing, working for you nightly.",
    monthly: 39,
    annual: 31,
    cta: "Go Pro",
    href: "/login",
    featured: true,
    leadIn: "Everything in Starter, plus",
    included: [
      "IBKR Flex auto-sync after close",
      "Quill AI over your own trades",
      "500 Quill AI credits / month",
      "Buy credit top-ups any time",
      "Full analytics by strategy & symbol",
      "Equity curve & portfolio history",
      "Priority support",
    ],
  },
];

type Cell = boolean | string;
type CompareRow = {
  feature: string;
  note?: string;
  starter: Cell;
  pro: Cell;
};
type CompareGroup = { title: string; rows: CompareRow[] };

const COMPARE: CompareGroup[] = [
  {
    title: "Journaling",
    rows: [
      { feature: "Trades logged", starter: "Unlimited", pro: "Unlimited" },
      { feature: "Manual entry & editing", starter: true, pro: true },
      {
        feature: "Calendar P&L",
        note: "Net of commissions",
        starter: true,
        pro: true,
      },
      { feature: "Rules board & affirmations", starter: true, pro: true },
      { feature: "Light & dark themes", starter: true, pro: true },
    ],
  },
  {
    title: "Imports & sync",
    rows: [
      { feature: "CSV / manual import", starter: true, pro: true },
      {
        feature: "IBKR Flex auto-sync",
        note: "Every weeknight after close",
        starter: false,
        pro: true,
      },
      { feature: "History retained", starter: "90 days", pro: "Unlimited" },
    ],
  },
  {
    title: "Quill AI",
    rows: [
      {
        feature: "Credits",
        starter: "25 / mo",
        pro: "500 / mo",
      },
      {
        feature: "Top-ups",
        note: "Buy extra credits any time",
        starter: true,
        pro: true,
      },
      { feature: "Reads imported IBKR fills", starter: false, pro: true },
      { feature: "Performance analysis", starter: "Basic", pro: true },
      { feature: "Pattern & mistake spotting", starter: false, pro: true },
      { feature: "Rule-adherence checks", starter: false, pro: true },
      { feature: "Natural-language trade entry", starter: false, pro: true },
    ],
  },
  {
    title: "Analytics",
    rows: [
      { feature: "Win rate & core stats", starter: true, pro: true },
      { feature: "By strategy & symbol", starter: false, pro: true },
      { feature: "Equity curve", starter: false, pro: true },
      { feature: "Portfolio history", starter: false, pro: true },
    ],
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is the free plan actually free?",
    a: "Yes. Manual logging, the calendar, core stats and rules cost nothing and always will. You only pay when you want IBKR sync and the full Quill AI.",
  },
  {
    q: "What do I need for IBKR sync?",
    a: "A Flex Web Service token from Interactive Brokers. Drop it into settings and Cuequill imports every fill weeknight after close — commissions and taxes included.",
  },
  {
    q: "Can I switch between monthly and yearly?",
    a: "Any time. Switching to yearly applies the discount immediately and prorates what you've already paid; switching back takes effect at your next renewal.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. Monthly cancels any time and runs to the end of the period. Annual stops renewing whenever you like, and Pro stays on until the term ends.",
  },
  {
    q: "What if I hit a plan limit?",
    a: "Nothing breaks. Once your monthly Quill AI credits are spent the chat pauses until the next cycle — your trades stay fully intact. On Pro you can top up credits any time; on Starter, upgrade to Pro for more.",
  },
  {
    q: "Does my trade data train the AI?",
    a: "No. Quill AI reads your trades to answer your questions in the moment. Your journal is yours — it isn't used to train models.",
  },
  {
    q: "Do you offer refunds?",
    a: "If Cuequill isn't for you, email within 14 days of a charge and we'll refund it, no interrogation.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("annual");

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Same fixed teal/indigo aurora wash used on the journal page so
          the pricing surface sits in the same atmosphere. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />
      <SiteHeader />

      <main className="flex-1 pt-20">
        <Standfirst left={`Pricing Supplement · ${today}`} right="2 Tiers " />

        <PricingHero />

        <PlansSpread cycle={cycle} setCycle={setCycle} />

        <CompareSection cycle={cycle} />

        <FaqSection />

        <Signoff />
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function PricingHero() {
  return (
    <section className="border-b border-[var(--rule)] px-6 md:px-10">
      <div className="max-w-[1200px] mx-auto py-20 md:py-28">
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-[10.5px] uppercase tracking-[0.24em] text-white/45 mb-8 flex items-center gap-3"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400" />
            Pricing
            <span className="h-px w-10 bg-[var(--rule)]" />
            <span className="text-white/30">Two tiers</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-[44px] sm:text-[64px] md:text-[86px] leading-[0.94] font-medium tracking-[-0.025em]"
            style={{ fontVariationSettings: '"opsz" 144' }}
          >
            Free for as long as you want.{" "}
            <span className="italic font-normal text-teal-300">
              Paid when you mean it.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="mt-8 max-w-xl text-[14px] text-white/65 leading-relaxed"
          >
            Log trades by hand for nothing, forever. Pay only when you want
            Cuequill to import from IBKR and answer questions about your own
            trading.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: Cycle;
  onChange: (c: Cycle) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-[var(--rule-strong)] p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-4 py-1.5 rounded-full text-[12px] uppercase tracking-[0.16em] font-medium transition cursor-pointer ${
          cycle === "monthly"
            ? "bg-white/[0.08] text-white"
            : "text-white/55 hover:text-white"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={`px-4 py-1.5 rounded-full text-[12px] uppercase tracking-[0.16em] font-medium transition cursor-pointer inline-flex items-center gap-2 ${
          cycle === "annual"
            ? "bg-white/[0.08] text-white"
            : "text-white/55 hover:text-white"
        }`}
      >
        Yearly
        <span className="text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25">
          −20%
        </span>
      </button>
    </div>
  );
}

// ─── Plans (3-up table, editorial styling) ───────────────────────────

function PlansSpread({
  cycle,
  setCycle,
}: {
  cycle: Cycle;
  setCycle: (c: Cycle) => void;
}) {
  return (
    <section className="border-b border-[var(--rule)] px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1100px] mx-auto">
        <SectionMark n="I" label="The tiers" />

        <div className="mt-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10">
          <h2
            className="text-[36px] md:text-[52px] leading-[1.02] font-medium tracking-[-0.02em] max-w-3xl"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            Two tiers.{" "}
            <span className="italic text-teal-300">No hidden fees.</span>
          </h2>
          <BillingToggle cycle={cycle} onChange={setCycle} />
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {PLANS.map((plan, i) => (
            <PlanColumn
              key={plan.name}
              plan={plan}
              cycle={cycle}
              index={i}
              isLast={i === PLANS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanColumn({
  plan,
  cycle,
  index,
  isLast,
}: {
  plan: Plan;
  cycle: Cycle;
  index: number;
  isLast: boolean;
}) {
  const isContact = plan.monthly === null;
  const price = cycle === "annual" ? plan.annual : plan.monthly;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.05 }}
      className={`relative flex flex-col rounded-2xl border border-white/10 md:backdrop-blur-md p-6 md:p-7 shadow-[0_2px_24px_var(--shadow-soft)] ${
        plan.featured
          ? "bg-teal-500/[0.06] border-teal-500/20"
          : "bg-white/[0.03]"
      }`}
    >
      {/* Name + recommended pill */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px] md:text-[22px] leading-none tracking-[-0.02em] font-medium">
          {plan.name}
        </h3>
        {plan.featured && (
          <span className="text-[9.5px] uppercase tracking-[0.22em] text-teal-300 border border-teal-500/30 rounded-full px-2 py-0.5">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[12px] text-white/55 leading-snug italic">
        {plan.tagline}
      </p>

      {/* Price + CTA on one row */}
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          {isContact ? (
            <span className="text-[24px] tracking-[-0.02em] font-medium">
              Let&apos;s talk
            </span>
          ) : price === 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[34px] md:text-[38px] leading-none tracking-[-0.025em] font-medium">
                £0
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/45">
                forever
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[34px] md:text-[38px] leading-none tracking-[-0.025em] font-medium tabular-nums">
                £{price}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/45">
                /mo
              </span>
            </div>
          )}
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40 tabular-nums">
            {isContact
              ? "One-time · invite-only"
              : price === 0
                ? "No card required"
                : cycle === "annual"
                  ? `£${(plan.annual ?? 0) * 12}/yr`
                  : "Cancel any time"}
          </p>
        </div>

        <Link
          href={plan.href}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full transition text-[11px] font-semibold uppercase tracking-[0.16em] ${
            plan.featured
              ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25"
              : "border border-white/15 text-white/85 hover:bg-white/[0.06]"
          }`}
        >
          {plan.cta}
          <i className="fa-solid fa-arrow-right text-[9px]" />
        </Link>
      </div>

      {/* Features - hairline divider above. Check = included, muted dash
          with strike = explicitly not included on this tier. */}
      <div className="mt-6 pt-5 border-t border-[var(--rule)]">
        {plan.leadIn && (
          <p className="mb-3 text-[10.5px] uppercase tracking-[0.22em] text-teal-300">
            {plan.leadIn}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {plan.included.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 text-[12.5px] text-white/85 leading-snug"
            >
              <i
                className="fa-solid fa-check shrink-0 mt-[3px] text-[10px] text-teal-300"
                aria-hidden
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {plan.excluded && plan.excluded.length > 0 && (
          <>
            <p className="mt-5 mb-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
              Not on this tier
            </p>
            <ul className="flex flex-col gap-2">
              {plan.excluded.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[12.5px] text-white/35 leading-snug line-through decoration-white/15"
                >
                  <i
                    className="fa-solid fa-xmark shrink-0 mt-[3px] text-[10px] text-white/30 no-underline"
                    aria-hidden
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </motion.article>
  );
}

// ─── Compare table ───────────────────────────────────────────────────

function CompareSection({ cycle }: { cycle: Cycle }) {
  return (
    <section className="border-b border-[var(--rule)] px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto">
        <SectionMark n="II" label="The lineage" />
        <h2
          className="mt-8 text-[36px] md:text-[44px] leading-[1.02] font-medium tracking-[-0.02em]"
          style={{ fontVariationSettings: '"opsz" 72' }}
        >
          What sits inside each tier.
        </h2>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md shadow-[0_2px_24px_var(--shadow-soft)]">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th className="font-normal px-5 md:px-6 py-5 text-[10.5px] uppercase tracking-[0.22em] text-white/40 align-bottom">
                  Feature
                </th>
                <PlanColHeader name="Starter" sub="Free" />
                <PlanColHeader
                  name="Pro"
                  sub={cycle === "annual" ? "£31/mo" : "£39/mo"}
                  accent
                />
              </tr>
            </thead>
            {COMPARE.map((group) => (
              <tbody key={group.title} className="contents">
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 md:px-6 py-2.5 text-[10.5px] uppercase tracking-[0.22em] text-teal-300 border-y border-[var(--rule)] bg-teal-500/[0.05]"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[var(--rule)] hover:bg-white/[0.015] transition"
                  >
                    <td className="px-5 md:px-6 py-3.5">
                      <div className="text-[13px] text-white/85">
                        {row.feature}
                      </div>
                      {row.note && (
                        <div className="text-[11px] text-white/40 leading-snug mt-0.5 italic">
                          {row.note}
                        </div>
                      )}
                    </td>
                    <CompareCell value={row.starter} />
                    <CompareCell value={row.pro} accent />
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}

function PlanColHeader({
  name,
  sub,
  accent,
}: {
  name: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <th className="font-normal w-[110px] md:w-[140px] px-2 py-5 text-center align-bottom">
      <div
        className={`text-[18px] tracking-[-0.01em] font-medium ${
          accent ? "text-teal-300" : "text-white/90"
        }`}
      >
        {name}
      </div>
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-white/40 mt-1 tabular-nums">
        {sub}
      </div>
    </th>
  );
}

function CompareCell({ value, accent }: { value: Cell; accent?: boolean }) {
  return (
    <td className="px-2 py-3.5 text-center">
      {value === true ? (
        <i
          className={`fa-solid fa-check text-[11px] ${accent ? "text-teal-300" : "text-teal-300/70"}`}
          aria-label="Included"
        />
      ) : value === false ? (
        <span className="text-white/20" aria-label="Not included">
          —
        </span>
      ) : (
        <span
          className={`text-[11.5px] font-medium tabular-nums ${accent ? "text-white/90" : "text-white/65"}`}
        >
          {value}
        </span>
      )}
    </td>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <section className="border-b border-[var(--rule)] px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <SectionMark n="III" label="Letters" />
          <h2
            className="mt-8 text-[36px] md:text-[44px] leading-[1.02] font-medium tracking-[-0.02em]"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            Frequently <span className="italic text-teal-300">asked.</span>
          </h2>
          <p className="mt-5 max-w-xs text-[13px] text-white/55 leading-relaxed">
            Or write to me directly — I usually reply same day.
          </p>
          <a
            href="mailto:hi@cuequill.app"
            className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-teal-300 hover:text-teal-200 transition"
          >
            hi@cuequill.app
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
          </a>
        </div>
        <div className="md:col-span-8 md:border-l md:border-[var(--rule)] md:pl-10 divide-y divide-[var(--rule)]">
          {FAQS.map((faq, i) => (
            <FaqRow key={faq.q} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Sign-off ────────────────────────────────────────────────────────

function Signoff() {
  return (
    <section className="px-6 md:px-10 py-28 md:py-36">
      <div className="max-w-[1200px] mx-auto">
        <SectionMark n="✶" label="Sign-off" />
        <h2
          className="mt-10 text-[44px] sm:text-[60px] md:text-[80px] leading-[0.95] font-medium tracking-[-0.025em] max-w-4xl"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Start free, today.{" "}
          <span className="italic text-teal-300">
            Upgrade when you mean it.
          </span>
        </h2>
        <div className="mt-12 flex items-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[13px] font-medium"
          >
            Open your journal
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
          <a
            href="mailto:hi@cuequill.app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition text-[12.5px]"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}
