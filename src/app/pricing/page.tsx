"use client";

import { motion } from "framer-motion";
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

      <main className="flex-1 px-6 md:px-10">
        {/* Heading */}
        <section className="max-w-[1200px] mx-auto pt-36 md:pt-44 pb-8 md:pb-12">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-6 flex items-center gap-3">
            <span className="w-6 h-px bg-white/30" />
            Pricing
          </div>
          <h1 className="text-[36px] sm:text-[52px] md:text-[68px] font-semibold leading-[0.98] tracking-[-0.02em] max-w-3xl">
            Free to start.
            <br />
            <em className="font-normal text-teal-300">Worth it</em> when you sync.
          </h1>
          <p className="mt-6 text-[14px] md:text-[15px] text-white/55 leading-relaxed max-w-xl">
            Log trades by hand for nothing, forever. Pay only when you want
            Cuequill to import from IBKR and answer questions about your own
            trading.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-2 ${
                cycle === "annual"
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:text-white"
              }`}
            >
              Annual
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300">
                −20%
              </span>
            </button>
          </div>
        </section>

        {/* Plan cards */}
        <section className="max-w-[1200px] mx-auto pb-24 md:pb-32 grid md:grid-cols-3 gap-5">
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
                    ? "border-teal-500/40 bg-teal-500/[0.06] shadow-[0_8px_40px_var(--shadow-soft)]"
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
        </section>

        {/* FAQ */}
        <section className="max-w-[900px] mx-auto pb-28 md:pb-40 border-t border-white/10 pt-16 md:pt-20">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">
            Questions, answered plainly.
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            <Faq
              q="Is the free plan actually free?"
              a="Yes. Manual logging, the calendar, core stats and rules cost nothing and always will. You only pay when you want IBKR sync and Quill AI."
            />
            <Faq
              q="What do I need for IBKR sync?"
              a="A Flex Web Service token from Interactive Brokers. Drop it into settings and Cuequill imports every fill weeknight after close — commissions and taxes included."
            />
            <Faq
              q="Can I cancel anytime?"
              a="Monthly plans cancel any time and run to the end of the period. Annual plans renew yearly; you can switch back to free whenever you like."
            />
            <Faq
              q="Does my trade data train the AI?"
              a="No. Quill AI reads your trades to answer your questions in the moment. Your journal is yours — it isn't used to train models."
            />
          </div>
        </section>
      </main>

      {/* Footer - matches the landing page */}
      <footer className="px-6 md:px-10 py-8 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-[11.5px] text-white/40">
          <div className="flex items-center gap-2">
            <CuequillLogo className="h-4 w-auto opacity-70" />
            <span>Cuequill · © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition">
              Home
            </Link>
            <a
              href="mailto:hi@cuequill.app"
              className="hover:text-white transition"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold tracking-tight mb-2">{q}</h3>
      <p className="text-[13px] text-white/55 leading-relaxed">{a}</p>
    </div>
  );
}
