"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PageLoading from "./PageLoading";
import {
  FaqRow,
  SectionMark,
  SiteFooter,
  SiteHeader,
} from "./_marketing/Chrome";

// ─── Page ────────────────────────────────────────────────────────────

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  if (status === "loading") return <PageLoading />;
  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen flex flex-col">
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
        <Hero />

        <FeatureSpread
          id="day"
          label="The Day View"
          align="right"
          heading={
            <>
              The thing
              <br />
              you&apos;ll{" "}
              <span className="italic text-teal-300">actually open.</span>
            </>
          }
          body="A calendar tinted by your P/L. Click any day, see what you did and why. No CSV exports. No pivot tables. Just the part you were going to do in Excel anyway, except you'll open it."
          stats={[
            ["Loads in", "2s"],
            ["Click to detail", "Yes"],
            ["Net of fees", "Yes"],
          ]}
          preview={<DayPreview />}
        />

        <FeatureSpread
          id="quill"
          label="Quill AI"
          align="left"
          heading={
            <>
              An assistant that
              <br />
              has{" "}
              <span className="italic text-teal-300">read your journal.</span>
            </>
          }
          body="Ask in plain English. Cuequill's AI answers from your trades, not the internet's. It can log a fresh fill in one sentence, then call it back when you ask."
          stats={[
            ["Reads", "Every fill"],
            ["Model", "Gemini"],
            ["Avg reply", "1.4s"],
          ]}
          preview={<QuillAIPreview />}
        />

        <FeatureSpread
          id="numbers"
          label="Numbers"
          align="right"
          heading={
            <>
              The ones your broker
              <br />
              <span className="italic text-teal-300">won&apos;t show you.</span>
            </>
          }
          body="Expectancy. Profit factor. Win rate sliced by strategy, symbol, hour. A risk budget you can't bury. Numbers chosen by a trader, not picked off a finance API."
          stats={[
            ["Expectancy", "$/trade"],
            ["Risk budget", "Per day"],
            ["Cuts by", "Strat/sym/hr"],
          ]}
          preview={<NumbersPreview />}
        />

        <FeatureSpread
          id="ibkr"
          label="IBKR sync"
          align="left"
          heading={
            <>
              One token. Nightly sync.
              <br />
              <span className="italic text-teal-300">Forget it.</span>
            </>
          }
          body="Drop a Flex Web Service token in settings. Cuequill imports every fill weeknight after close — commissions and taxes included. Manual entry still works."
          stats={[
            ["Runs", "After close"],
            ["Commissions", "Imported"],
            ["Setup", "≈3 min"],
          ]}
          preview={<IBKRPreview />}
        />

        <FaqSection />

        <Signoff />
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1200px] mx-auto py-20 md:py-32">
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.2em] text-white/55">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Trading journal · v1.0
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-[40px] sm:text-[60px] md:text-[76px] leading-[0.98] font-medium tracking-[-0.025em]"
          >
            Know why you make money.{" "}
            <span className="italic font-normal text-teal-300">
              And why you don&apos;t.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="mt-8 max-w-md text-[14px] text-white/65 leading-relaxed"
          >
            Built for discretionary options traders who keep meaning to read
            their journal and never do. IBKR-synced, AI-queryable, opinionated
            about which numbers actually matter.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
            className="mt-10 flex items-center gap-3 flex-wrap"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[13px] font-medium"
            >
              Open your journal
              <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
            <a
              href="#day"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition text-[12.5px]"
            >
              Read the issue
              <i className="fa-solid fa-arrow-down text-[10px]" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature spread ─────────────────────────────────────────────────
// Asymmetric two-up. Side flips per section so the page reads as a
// sequence of spreads instead of a uniform grid.

function FeatureSpread({
  id,
  label,
  align,
  heading,
  body,
  stats,
  preview,
}: {
  id: string;
  label: string;
  align: "left" | "right";
  heading: React.ReactNode;
  body: React.ReactNode;
  stats: [string, string][];
  preview: React.ReactNode;
}) {
  const textOnLeft = align === "left";
  return (
    <section
      id={id}
      className="px-6 md:px-10 py-20 md:py-28"
    >
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-10 md:gap-12 items-start">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`md:col-span-5 ${textOnLeft ? "md:order-1" : "md:order-2"} md:sticky md:top-28 self-start`}
        >
          <SectionMark label={label} />

          <h2 className="mt-6 text-[34px] md:text-[48px] leading-[1.04] font-medium tracking-[-0.02em]">
            {heading}
          </h2>

          <p className="mt-6 max-w-md text-[13.5px] text-white/60 leading-relaxed">
            {body}
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-x-4 gap-y-3 max-w-md border-t border-white/10 pt-5">
            {stats.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  {k}
                </dt>
                <dd className="text-[12px] text-white/80 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
          className={`md:col-span-7 ${textOnLeft ? "md:order-2" : "md:order-1"}`}
        >
          {preview}
        </motion.div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Cuequill, exactly?",
    a: "A journal for discretionary options traders. Log trades by hand or sync them from IBKR, review them on a P/L-tinted calendar, and ask Quill AI questions about your own trading.",
  },
  {
    q: "Do I need Interactive Brokers?",
    a: "No. Manual entry works fully on its own. IBKR sync is a convenience — drop in a Flex Web Service token and Cuequill imports every fill weeknight after close, commissions and taxes included.",
  },
  {
    q: "Is it free to try?",
    a: "Yes. The Starter plan — manual logging, calendar, core stats and rules — is free forever. You only pay when you want IBKR sync and the full Quill AI.",
  },
  {
    q: "Does Quill AI use my trades to train models?",
    a: "No. It reads your trades to answer your questions in the moment. Your journal is yours and isn't used to train models.",
  },
];

function FaqSection() {
  return (
    <section className="px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <SectionMark label="FAQ" />
          <h2 className="mt-6 text-[32px] md:text-[40px] leading-[1.04] font-medium tracking-[-0.02em]">
            Questions, before
            <br />
            <span className="italic text-teal-300">you start.</span>
          </h2>
          <p className="mt-5 max-w-xs text-[13px] text-white/55 leading-relaxed">
            More on the pricing page, or write directly.
          </p>
          <a
            href="mailto:hi@cuequill.app"
            className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-teal-300 hover:text-teal-200 transition"
          >
            hi@cuequill.app
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
          </a>
        </div>
        <div className="md:col-span-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_var(--shadow-soft)] divide-y divide-white/[0.07] overflow-hidden">
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
    <section className="px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_var(--shadow-soft)] p-8 md:p-14">
        <SectionMark label="Get started" />
        <h2 className="mt-6 text-[36px] sm:text-[52px] md:text-[68px] leading-[0.98] font-medium tracking-[-0.025em] max-w-4xl">
          Your next month doesn&apos;t have to look like{" "}
          <span className="italic text-teal-300">last month.</span>
        </h2>
        <div className="mt-10 flex items-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[13px] font-medium"
          >
            Open your journal
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition text-[12.5px]"
          >
            See pricing
          </Link>
          <span className="text-[11.5px] uppercase tracking-[0.18em] text-white/35 ml-1">
            Three minutes to set up
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Product previews ────────────────────────────────────────────────

function PreviewClipping({
  caption,
  meta,
  children,
}: {
  caption: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex flex-col">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden shadow-[0_2px_24px_var(--shadow-soft)]">
        {children}
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between text-[10.5px] uppercase tracking-[0.22em] text-white/40">
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-teal-400" />
          {caption}
        </span>
        {meta && <span className="tabular-nums">{meta}</span>}
      </figcaption>
    </figure>
  );
}

function DayPreview() {
  return (
    <PreviewClipping caption="Day view" meta="Mon · June 9">
      <div className="px-5 md:px-6 py-5 border-b border-[var(--rule)] flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1.5">
            Net P/L
          </p>
          <p className="text-[38px] md:text-[46px] leading-none tabular-nums text-green-300 tracking-[-0.02em] font-medium">
            +$847.23
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25">
            3W
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/25">
            1L
          </span>
          <span className="text-white/40">75% win rate</span>
        </div>
      </div>
      <div className="divide-y divide-[var(--rule)]">
        {[
          {
            sym: "SPY",
            opt: "CALL",
            strike: 600,
            qty: 5,
            pl: 420.0,
            strat: "MA 40",
          },
          {
            sym: "AAPL",
            opt: "PUT",
            strike: 230,
            qty: 3,
            pl: 285.0,
            strat: "First Red",
          },
          {
            sym: "NVDA",
            opt: "CALL",
            strike: 140,
            qty: 2,
            pl: -57.77,
            strat: "Bullish Gap",
          },
          {
            sym: "TSLA",
            opt: "CALL",
            strike: 380,
            qty: 4,
            pl: 200.0,
            strat: "Channel Brk",
          },
        ].map((t, i) => {
          const w = t.pl >= 0;
          return (
            <div key={i} className="px-5 md:px-6 py-3 flex items-center gap-4">
              <span
                className={`w-0.5 h-8 rounded-full shrink-0 ${
                  w ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="font-semibold text-[13.5px]">{t.sym}</span>
                <span
                  className={`text-[9.5px] uppercase font-semibold px-1.5 py-0.5 rounded-full border ${
                    t.opt === "CALL"
                      ? "bg-green-500/10 text-green-300 border-green-500/25"
                      : "bg-red-500/10 text-red-300 border-red-500/25"
                  }`}
                >
                  {t.opt}
                </span>
                <span className="text-[11px] text-white/40 tabular-nums">
                  {t.strike} × {t.qty}
                </span>
                <span className="text-[11px] text-white/30 truncate hidden sm:inline ml-1">
                  · {t.strat}
                </span>
              </div>
              <span
                className={`tabular-nums text-[14px] font-medium ${
                  w ? "text-green-300" : "text-red-300"
                }`}
              >
                {w ? "+" : "−"}${Math.abs(t.pl).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-5 md:px-6 py-3 border-t border-[var(--rule)] flex items-center justify-between text-[10.5px] text-white/45 uppercase tracking-[0.18em]">
        <span>
          Avg{" "}
          <span className="text-white/75 tabular-nums normal-case tracking-normal">
            +$211.81
          </span>
        </span>
        <span className="tabular-nums">4 trades · 1 PUT · 3 CALLs</span>
      </div>
    </PreviewClipping>
  );
}

function QuillAIPreview() {
  return (
    <PreviewClipping caption="Quill AI" meta="347 trades read">
      <div className="px-5 md:px-6 pt-5 pb-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[11px] uppercase tracking-[0.16em] font-medium">
          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
          Quill AI
        </div>
      </div>
      <div className="px-5 md:px-6 py-3 flex flex-col gap-2">
        <Bubble side="user">Which strategy is leaking money this month?</Bubble>
        <Bubble side="ai">
          <span className="font-semibold text-white">Hard Floor</span> — 10
          closed this month, 40% win rate, expectancy{" "}
          <span className="text-red-300 tabular-nums font-medium">−$18.40</span>
          /trade. Want to see them?
        </Bubble>
        <Bubble side="user">
          Log 3 SPY 600{" "}
          <span className="text-green-300 font-semibold">CALL</span> at $1.20
          expiring Friday.
        </Bubble>
        <Bubble side="ai">
          Saved. 3× SPY 600{" "}
          <span className="text-green-300 font-semibold">CALL</span> opened
          today at $1.20/contract, expiring 2026-06-13.
        </Bubble>
      </div>
      <div className="mx-5 md:mx-6 mb-5 mt-2 flex items-end gap-2 rounded-2xl border border-[var(--rule)] bg-white/[0.04] px-3 py-2">
        <span className="flex-1 text-[13.5px] text-white/40 py-1 italic">
          Ask about your last five losses…
        </span>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25">
          <i className="fa-solid fa-arrow-up text-[11px]" />
        </span>
      </div>
    </PreviewClipping>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "user" | "ai";
  children: React.ReactNode;
}) {
  const isUser = side === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words ${
          isUser
            ? "bg-teal-500/15 text-white border border-teal-500/25"
            : "bg-white/[0.04] text-white/90 border border-[var(--rule)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function NumbersPreview() {
  return (
    <PreviewClipping caption="Statistics" meta="MTD">
      <div className="px-5 md:px-6 pt-5 pb-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">
          Expectancy
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-[54px] md:text-[68px] leading-none tabular-nums text-green-300 tracking-[-0.025em] font-medium">
            +$24.18
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">
            / trade
          </span>
        </div>
      </div>

      <div className="px-5 md:px-6 pb-5 pt-4 grid grid-cols-3 gap-3 border-b border-[var(--rule)]">
        {[
          { k: "Win rate", v: "58%", tone: "good" },
          { k: "Profit factor", v: "2.14", tone: "good" },
          { k: "Max DD", v: "−$612", tone: "bad" },
        ].map((s) => (
          <div
            key={s.k}
            className="border border-[var(--rule)] bg-white/[0.025] p-3 rounded-xl"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1">
              {s.k}
            </p>
            <p
              className={`text-[20px] tabular-nums tracking-[-0.01em] font-medium ${
                s.tone === "good" ? "text-green-300" : "text-red-300"
              }`}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <div className="px-5 md:px-6 py-4">
        <div className="flex items-center justify-between mb-2 text-[11px]">
          <span className="text-white/55 uppercase tracking-[0.14em]">
            Daily risk budget
          </span>
          <span className="tabular-nums">
            <span className="text-amber-300">$120</span>
            <span className="text-white/30"> / $200</span>
            <span className="text-white/40 ml-1.5 uppercase tracking-[0.12em] text-[10px]">
              60% used
            </span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500/80"
            style={{ width: "60%" }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10.5px] uppercase tracking-[0.14em] text-white/35">
          <span>Streak: 3W active</span>
          <span>Best hour: 14:00 ET</span>
        </div>
      </div>
    </PreviewClipping>
  );
}

function IBKRPreview() {
  return (
    <PreviewClipping caption="IBKR sync" meta="Last run 22:00 ET">
      <div className="px-5 md:px-6 py-4 border-b border-[var(--rule)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-300">
            <i className="fa-solid fa-arrows-rotate text-[13px]" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              IBKR Auto-sync
            </p>
            <p className="text-[13px] text-white/80 tabular-nums">
              Synced 14m ago
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 text-[10.5px] uppercase tracking-[0.16em] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Connected
        </span>
      </div>

      <div className="px-5 md:px-6 py-4 grid grid-cols-3 gap-3 border-b border-[var(--rule)]">
        {[
          { k: "Imported", v: "4", tone: "good" },
          { k: "Skipped", v: "0", tone: "neutral" },
          { k: "Next run", v: "22:00 ET", tone: "neutral" },
        ].map((s) => (
          <div key={s.k} className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              {s.k}
            </p>
            <p
              className={`text-[20px] tabular-nums tracking-[-0.01em] font-medium ${
                s.tone === "good" ? "text-green-300" : "text-white/85"
              }`}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="px-5 md:px-6 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
          Last run · fills
        </p>
        <div className="divide-y divide-[var(--rule)]">
          {[
            {
              sym: "AAPL",
              opt: "PUT",
              strike: 230,
              qty: 3,
              time: "14:30",
              price: 1.2,
            },
            {
              sym: "SPY",
              opt: "CALL",
              strike: 600,
              qty: 5,
              time: "13:00",
              price: 2.85,
            },
            {
              sym: "NVDA",
              opt: "CALL",
              strike: 140,
              qty: 2,
              time: "11:00",
              price: 0.95,
            },
            {
              sym: "TSLA",
              opt: "CALL",
              strike: 380,
              qty: 4,
              time: "10:30",
              price: 1.4,
            },
          ].map((t, i) => (
            <div
              key={i}
              className="px-5 md:px-6 py-2.5 flex items-center gap-3 text-[12.5px]"
            >
              <span className="w-12 text-white/35 tabular-nums shrink-0">
                {t.time}
              </span>
              <span className="font-semibold text-white/85 w-12 shrink-0">
                {t.sym}
              </span>
              <span
                className={`text-[9.5px] uppercase font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
                  t.opt === "CALL"
                    ? "bg-green-500/10 text-green-300 border-green-500/25"
                    : "bg-red-500/10 text-red-300 border-red-500/25"
                }`}
              >
                {t.opt}
              </span>
              <span className="text-white/45 tabular-nums">
                {t.strike} × {t.qty}
              </span>
              <span className="ml-auto text-white/65 tabular-nums">
                @ ${t.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewClipping>
  );
}
