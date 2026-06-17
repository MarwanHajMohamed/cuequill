"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

// Icon-only mark - matches the navbar / landing logo.
const CuequillLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="16 25 30 52"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    aria-label="Cuequill"
  >
    <path
      d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
      fill="currentColor"
    />
    <path
      d="M31 47V75"
      style={{ stroke: "var(--background)" }}
      strokeWidth="1.32"
      strokeLinecap="round"
    />
    <path
      d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
      style={{ fill: "var(--background)" }}
    />
  </svg>
);

type Cycle = "monthly" | "annual";

type Plan = {
  name: string;
  tagline: string;
  monthly: number | null; // null = bespoke / contact
  annual: number | null; // per month, billed annually
  oneLine: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For the journal you keep meaning to read.",
    monthly: 0,
    annual: 0,
    oneLine: "Free forever",
    cta: "Start free",
    href: "/login",
    features: [
      "Manual trade logging",
      "Calendar P&L, net of commissions",
      "Core statistics & win rate",
      "Rules board & affirmations",
      "Light and dark themes",
    ],
  },
  {
    name: "Pro",
    tagline: "The whole thing, working for you nightly.",
    monthly: 14,
    annual: 11,
    oneLine: "Everything in Starter, plus",
    cta: "Go Pro",
    href: "/login",
    featured: true,
    features: [
      "IBKR Flex auto-sync after close",
      "Quill AI over your own trades",
      "Full analytics by strategy & symbol",
      "Unlimited trades & history",
      "Portfolio history & equity curve",
      "Priority support",
    ],
  },
  {
    name: "Founder",
    tagline: "Pay once. Keep it while Cuequill grows.",
    monthly: null,
    annual: null,
    oneLine: "One-time, invite-only",
    cta: "Request access",
    href: "mailto:hi@cuequill.app?subject=Founder%20access",
    features: [
      "Everything in Pro, for life",
      "Locked-in founder pricing",
      "Early access to new features",
      "Direct line to the maker",
    ],
  },
];

// ─── Compare table ───────────────────────────────────────────────────
type Cell = boolean | string;
type CompareRow = {
  feature: string;
  note?: string;
  starter: Cell;
  pro: Cell;
  founder: Cell;
};
type CompareGroup = { title: string; icon: string; rows: CompareRow[] };

const COMPARE: CompareGroup[] = [
  {
    title: "Journaling",
    icon: "fa-solid fa-pen-to-square",
    rows: [
      { feature: "Trades logged", starter: "Unlimited", pro: "Unlimited", founder: "Unlimited" },
      { feature: "Manual entry & editing", starter: true, pro: true, founder: true },
      { feature: "Calendar P&L", note: "Net of commissions", starter: true, pro: true, founder: true },
      { feature: "Rules board & affirmations", starter: true, pro: true, founder: true },
      { feature: "Light & dark themes", starter: true, pro: true, founder: true },
    ],
  },
  {
    title: "Imports & sync",
    icon: "fa-solid fa-arrows-rotate",
    rows: [
      { feature: "CSV / manual import", starter: true, pro: true, founder: true },
      { feature: "IBKR Flex auto-sync", note: "Every weeknight after close", starter: false, pro: true, founder: true },
      { feature: "Commissions & taxes included", starter: false, pro: true, founder: true },
      { feature: "History retained", starter: "90 days", pro: "Unlimited", founder: "Unlimited" },
    ],
  },
  {
    title: "Quill AI",
    icon: "fa-solid fa-wand-magic-sparkles",
    rows: [
      { feature: "Chat with your trades", starter: "5 / day", pro: "Unlimited", founder: "Unlimited" },
      { feature: "Reads imported IBKR fills", starter: false, pro: true, founder: true },
      { feature: "Performance analysis", starter: "Basic", pro: true, founder: true },
      { feature: "Pattern & mistake spotting", starter: false, pro: true, founder: true },
      { feature: "Rule-adherence checks", starter: false, pro: true, founder: true },
      { feature: "Natural-language trade entry", starter: false, pro: true, founder: true },
      { feature: "Saved threads & history", starter: false, pro: true, founder: true },
    ],
  },
  {
    title: "Analytics",
    icon: "fa-solid fa-chart-line",
    rows: [
      { feature: "Win rate & core stats", starter: true, pro: true, founder: true },
      { feature: "By strategy & symbol", starter: false, pro: true, founder: true },
      { feature: "Equity curve", starter: false, pro: true, founder: true },
      { feature: "Portfolio history", starter: false, pro: true, founder: true },
    ],
  },
  {
    title: "Early supporter",
    icon: "fa-solid fa-seedling",
    rows: [
      { feature: "Early access to new features", starter: false, pro: false, founder: true },
      { feature: "Locked-in founder pricing", starter: false, pro: false, founder: true },
      { feature: "Direct line to the maker", starter: false, pro: false, founder: true },
      { feature: "A say in the roadmap", starter: false, pro: "Vote", founder: "Vote + propose" },
    ],
  },
];

// ─── Roadmap ─────────────────────────────────────────────────────────
const ROADMAP: { quarter: string; icon: string; title: string; body: string }[] = [
  {
    quarter: "Q3 2026",
    icon: "fa-solid fa-building-columns",
    title: "More brokers",
    body: "Bring in fills from Schwab and Tastytrade the same way IBKR works today — drop a token, sync after close.",
  },
  {
    quarter: "Q3 2026",
    icon: "fa-solid fa-envelope-open-text",
    title: "Quill AI weekly digest",
    body: "A short written read on your week — what worked, what slipped, and which rules you actually followed.",
  },
  {
    quarter: "Q4 2026",
    icon: "fa-solid fa-share-nodes",
    title: "Shareable recaps",
    body: "Turn a day or a trade into a clean, link-shareable card — without exposing the rest of your journal.",
  },
  {
    quarter: "Q4 2026",
    icon: "fa-solid fa-bell",
    title: "Sync notifications",
    body: "A push the moment the nightly import lands, with anything that looked like a duplicate flagged up front.",
  },
  {
    quarter: "Q1 2027",
    icon: "fa-solid fa-flask",
    title: "Setup library",
    body: "Save your repeatable setups and let Quill AI tag new trades against them automatically.",
  },
];

// ─── FAQ ─────────────────────────────────────────────────────────────
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
    q: "Can I switch between monthly and yearly billing?",
    a: "Any time. Switching to yearly applies the discount immediately and prorates what you've already paid; switching back takes effect at your next renewal.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. Monthly plans cancel any time and run to the end of the period. Annual plans stop renewing whenever you like, and you keep Pro until the term ends.",
  },
  {
    q: "What happens if I exceed my plan's limits?",
    a: "Nothing breaks. On Starter, Quill AI simply pauses for the day once you hit the cap and your trades stay fully intact — upgrade to lift the limit.",
  },
  {
    q: "Do you offer pricing for different regions?",
    a: "Prices are shown in GBP today. Regional pricing is on the roadmap — reach out if your currency matters and we'll sort something out.",
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

export default function PricingPage() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [cycle, setCycle] = useState<Cycle>("annual");

  const priceFor = (plan: Plan) => {
    if (plan.monthly === null) return null;
    const v = cycle === "annual" ? plan.annual : plan.monthly;
    return v ?? 0;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar - mirrors the landing header so the page feels of-a-piece.
          Hidden when signed in: the global app navbar is already shown. */}
      {!signedIn && (
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-3 md:px-10">
          <div className="pointer-events-auto flex justify-between items-center w-full max-w-[1200px] mt-5 py-2 pl-3 pr-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-[0_2px_24px_var(--shadow-soft)]">
            <Link href="/" className="flex items-center gap-2 pl-2 pr-3 py-1">
              <CuequillLogo className="h-6 w-auto" />
              <span className="text-[14px] font-semibold tracking-tight">
                Cuequill
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium"
              >
                Sign in
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 md:px-10 pt-36 md:pt-44 pb-14 md:pb-20">
          {/* Oversized faded backdrop word */}
          <span
            aria-hidden
            className="pointer-events-none select-none absolute left-1/2 -translate-x-1/2 top-20 md:top-16 text-[26vw] md:text-[20vw] font-semibold tracking-tighter leading-none text-white/[0.035]"
          >
            Pricing
          </span>

          <div className="relative max-w-[760px] mx-auto text-center">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-6 inline-flex items-center gap-3">
              <span className="w-6 h-px bg-white/30" />
              Plans
              <span className="w-6 h-px bg-white/30" />
            </div>
            <h1 className="text-[34px] sm:text-[48px] md:text-[58px] font-semibold leading-[1.02] tracking-[-0.02em]">
              A discretionary options journal.
              <br />
              <em className="font-normal text-teal-300">Priced honestly.</em>
            </h1>
            <p className="mt-6 text-[14px] md:text-[15px] text-white/55 leading-relaxed max-w-xl mx-auto">
              Log trades by hand for nothing, forever. Pay only when you want
              Cuequill to import from IBKR and answer questions about your own
              trading.
            </p>

            {/* Billing toggle */}
            <div className="mt-9 inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setCycle("monthly")}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer ${
                  cycle === "monthly"
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setCycle("annual")}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-2 ${
                  cycle === "annual"
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                Yearly
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Plan cards ───────────────────────────────────────────── */}
        <section className="relative px-6 md:px-10 pb-10 md:pb-14">
          <div className="max-w-[1100px] mx-auto grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => {
              const price = priceFor(plan);
              const isContact = plan.monthly === null;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.06 }}
                  className={`relative flex flex-col rounded-3xl p-6 md:p-7 border ${
                    plan.featured
                      ? "border-teal-500/40 bg-teal-500/[0.06] shadow-[0_8px_40px_var(--shadow-soft)] md:-mt-3 md:mb-3"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute top-5 right-5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/30">
                      Most popular
                    </span>
                  )}

                  <h2 className="text-[18px] font-semibold tracking-tight">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-[12.5px] text-white/50 leading-snug min-h-[34px]">
                    {plan.tagline}
                  </p>

                  <div className="mt-5 flex items-end gap-1.5 min-h-[44px]">
                    {isContact ? (
                      <span className="text-[26px] font-semibold tracking-tight">
                        Let&apos;s talk
                      </span>
                    ) : price === 0 ? (
                      <span className="text-[40px] font-semibold tracking-tight leading-none">
                        £0
                      </span>
                    ) : (
                      <>
                        <span className="text-[40px] font-semibold tracking-tight leading-none">
                          £{price}
                        </span>
                        <span className="text-[13px] text-white/45 mb-1">
                          /mo
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-white/40 min-h-[16px]">
                    {isContact
                      ? plan.oneLine
                      : price === 0
                        ? plan.oneLine
                        : cycle === "annual"
                          ? `Billed annually · £${(plan.annual ?? 0) * 12}/yr`
                          : "Billed monthly · cancel anytime"}
                  </p>

                  <Link
                    href={plan.href}
                    className={`mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full transition text-[13.5px] font-semibold ${
                      plan.featured
                        ? "bg-white/90 text-[var(--background)] hover:bg-white"
                        : "bg-white/[0.06] text-white border border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </Link>

                  <div className="mt-6 pt-5 border-t border-white/10 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/35 mb-3">
                      {plan.oneLine}
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-[13px] text-white/75"
                        >
                          <i className="fa-solid fa-check text-teal-300 text-[11px] mt-[3px] shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="max-w-[640px] mx-auto mt-10 text-center text-[12px] text-white/40 leading-relaxed">
            Early supporters get 20% off for life on annual plans, plus a
            behind-the-scenes line into the product, the roadmap, and the
            chance to shape where Cuequill goes next.
          </p>
        </section>

        {/* ── Built on ─────────────────────────────────────────────── */}
        <section className="px-6 md:px-10 py-10 md:py-14">
          <p className="text-center text-[11px] uppercase tracking-[0.22em] text-white/35 mb-6">
            Built on
          </p>
          <div className="max-w-[760px] mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-white/40">
            <BuiltOn icon="fa-solid fa-building-columns" label="Interactive Brokers" />
            <BuiltOn icon="fa-solid fa-wand-magic-sparkles" label="Google Gemini" />
            <BuiltOn icon="fa-solid fa-database" label="MongoDB" />
            <BuiltOn icon="fa-solid fa-shield-halved" label="Bank-grade encryption" />
          </div>
        </section>

        {/* ── Compare plans ────────────────────────────────────────── */}
        <section className="px-6 md:px-10 pb-24 md:pb-32 pt-8">
          <div className="max-w-[1000px] mx-auto">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center mb-10">
              Compare plans
            </h2>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
              {/* Sticky-feel header */}
              <div className="grid grid-cols-[1.6fr_repeat(3,0.9fr)] md:grid-cols-[2fr_repeat(3,1fr)] items-end px-4 md:px-6 py-4 border-b border-white/10">
                <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                  Features
                </span>
                <PlanHead name="Starter" sub="Free" />
                <PlanHead
                  name="Pro"
                  sub={cycle === "annual" ? "£11/mo" : "£14/mo"}
                  accent
                />
                <PlanHead name="Founder" sub="One-time" />
              </div>

              {COMPARE.map((group) => (
                <div key={group.title}>
                  <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 bg-white/[0.025] border-b border-white/[0.07]">
                    <i className={`${group.icon} text-teal-300/80 text-[11px]`} />
                    <span className="text-[11px] uppercase tracking-[0.16em] text-white/55 font-medium">
                      {group.title}
                    </span>
                  </div>
                  {group.rows.map((row) => (
                    <div
                      key={row.feature}
                      className="grid grid-cols-[1.6fr_repeat(3,0.9fr)] md:grid-cols-[2fr_repeat(3,1fr)] items-center px-4 md:px-6 py-3 border-b border-white/[0.05] hover:bg-white/[0.02] transition"
                    >
                      <div className="pr-3">
                        <div className="text-[13px] text-white/85">
                          {row.feature}
                        </div>
                        {row.note && (
                          <div className="text-[11px] text-white/40 leading-snug mt-0.5">
                            {row.note}
                          </div>
                        )}
                      </div>
                      <CompareCell value={row.starter} />
                      <CompareCell value={row.pro} accent />
                      <CompareCell value={row.founder} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Product roadmap ──────────────────────────────────────── */}
        <section className="px-6 md:px-10 pb-24 md:pb-32 border-t border-white/10 pt-16 md:pt-20">
          <div className="max-w-[760px] mx-auto">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center mb-3">
              Product roadmap
            </h2>
            <p className="text-center text-[13.5px] text-white/55 mb-12 max-w-md mx-auto">
              Where Cuequill is headed. Pro and Founder plans get it first.
            </p>

            <div className="relative pl-6 md:pl-8">
              {/* Spine */}
              <span className="absolute left-[7px] md:left-[9px] top-1 bottom-1 w-px bg-white/10" />
              <div className="flex flex-col gap-5">
                {ROADMAP.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.05 }}
                    className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.03] transition"
                  >
                    {/* Node */}
                    <span className="absolute -left-[26px] md:-left-[34px] top-6 w-3.5 h-3.5 rounded-full bg-teal-400/80 border-2 border-[var(--background)] shadow-[0_0_0_3px_rgba(20,184,166,0.15)]" />
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <i className={`${item.icon} text-teal-300 text-[13px]`} />
                        <h3 className="text-[14.5px] font-semibold tracking-tight">
                          {item.title}
                        </h3>
                      </div>
                      <span className="text-[11px] font-medium text-white/40 tabular-nums shrink-0">
                        {item.quarter}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/55 leading-relaxed">
                      {item.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section className="px-6 md:px-10 pb-28 md:pb-40 border-t border-white/10 pt-16 md:pt-20">
          <div className="max-w-[760px] mx-auto">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center mb-10">
              Frequently asked questions
            </h2>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.07] overflow-hidden">
              {FAQS.map((faq, i) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-12 border-t border-white/10">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <CuequillLogo className="h-5 w-auto" />
              <span className="text-[14px] font-semibold tracking-tight">
                Cuequill
              </span>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed max-w-[200px]">
              A discretionary options journal that remembers for you.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: "Overview", href: "/" },
              { label: "Pricing", href: "/pricing" },
              { label: "Sign in", href: "/login" },
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              { label: "Quill AI", href: "/" },
              { label: "IBKR sync", href: "/" },
            ]}
          />
          <FooterCol
            title="Contact"
            links={[
              { label: "hi@cuequill.app", href: "mailto:hi@cuequill.app" },
            ]}
          />
        </div>
        <div className="max-w-[1100px] mx-auto mt-10 pt-6 border-t border-white/10 text-[11.5px] text-white/35">
          Cuequill · © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────

function BuiltOn({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium grayscale opacity-70 hover:opacity-100 transition">
      <i className={`${icon} text-[14px]`} />
      {label}
    </span>
  );
}

function PlanHead({
  name,
  sub,
  accent,
}: {
  name: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-[13px] font-semibold ${
          accent ? "text-teal-300" : "text-white/85"
        }`}
      >
        {name}
      </div>
      <div className="text-[11px] text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function CompareCell({ value, accent }: { value: Cell; accent?: boolean }) {
  return (
    <div className="flex justify-center text-center">
      {value === true ? (
        <i
          className={`fa-solid fa-check text-[12px] ${accent ? "text-teal-300" : "text-teal-300/80"}`}
          aria-label="Included"
        />
      ) : value === false ? (
        <span className="text-white/20" aria-label="Not included">
          —
        </span>
      ) : (
        <span
          className={`text-[12px] font-medium ${accent ? "text-white/85" : "text-white/65"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-white/[0.02] transition"
        aria-expanded={open}
      >
        <span className="text-[14px] font-medium text-white/90">{q}</span>
        <i
          className={`fa-solid fa-chevron-down text-[11px] text-white/45 transition-transform duration-200 shrink-0 ${
            open ? "-rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-[13px] text-white/55 leading-relaxed max-w-2xl">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.16em] text-white/35 mb-3">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-[12.5px] text-white/55 hover:text-white transition"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
