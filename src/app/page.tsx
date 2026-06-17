"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageLoading from "./PageLoading";
import ThemeToggle from "@/components/ThemeToggle";

// Icon-only mark - matches the navbar / signed-in app logo.
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

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") return <PageLoading />;
  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-3 md:px-10">
        <div className="pointer-events-auto flex justify-between items-center w-full max-w-[1200px] mt-5 py-2 pl-3 pr-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-[0_2px_24px_var(--shadow-soft)]">
          <Link href="/" className="flex items-center gap-2 pl-2 pr-3 py-1">
            <CuequillLogo className="h-6 w-auto" />
            <span className="text-[14px] font-semibold tracking-tight">
              Cuequill
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-white/60 hover:text-white transition text-[13px] font-medium"
            >
              Pricing
            </Link>
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

      <main className="flex-1 px-6 md:px-10">
        {/* ──────────────────────────────────────────────────────────── */}
        {/* Hero - editorial, left-aligned, single accent word in italic */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden max-w-[1200px] mx-auto pt-36 md:pt-44 pb-20 md:pb-28">
          {/* Oversized faded backdrop word - same motif as the pricing page. */}
          <span
            aria-hidden
            className="pointer-events-none select-none absolute left-1/2 -translate-x-1/2 top-24 md:top-20 text-[26vw] md:text-[20vw] font-semibold tracking-tighter leading-none text-white/[0.035]"
          >
            Journal
          </span>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative text-center max-w-[760px] mx-auto"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-6 inline-flex items-center gap-3">
              <span className="w-6 h-px bg-white/30" />
              Cuequill · v0.1
              <span className="w-6 h-px bg-white/30" />
            </div>
            <h1 className="text-[34px] sm:text-[48px] md:text-[58px] font-semibold leading-[1.02] tracking-[-0.02em]">
              A discretionary options journal
              <br />
              that <em className="font-normal text-teal-300">remembers</em> for
              you.
            </h1>
            <p className="mt-6 text-[14px] md:text-[15px] text-white/55 leading-relaxed max-w-xl mx-auto">
              Built for traders who keep meaning to read their journal and never
              do. IBKR-synced, AI-queryable, opinionated about which numbers
              actually matter.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 text-[var(--background)] hover:bg-white transition text-[13.5px] font-semibold"
              >
                Sign in
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </Link>
              <a
                href="#look"
                className="px-5 py-2.5 rounded-full bg-white/[0.06] text-white border border-white/15 hover:bg-white/10 transition text-[13px] inline-flex items-center gap-1.5"
              >
                See it first
                <i className="fa-solid fa-arrow-down text-[10px]" />
              </a>
            </div>
          </motion.div>

          {/* Built-on strip - mirrors the pricing page. */}
          <div className="relative mt-16 md:mt-24 pt-8 border-t border-white/10">
            <p className="text-center text-[11px] uppercase tracking-[0.22em] text-white/35 mb-6">
              Built for · built on
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-white/40">
              <BuiltOn icon="fa-solid fa-chart-simple" label="US options" />
              <BuiltOn icon="fa-solid fa-building-columns" label="Interactive Brokers" />
              <BuiltOn icon="fa-solid fa-wand-magic-sparkles" label="Google Gemini" />
              <BuiltOn icon="fa-solid fa-lock" label="Invite-only" />
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* What it looks like - one real-feeling preview, not a grid    */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          id="look"
          className="max-w-[1200px] mx-auto pb-24 md:pb-32 grid md:grid-cols-12 gap-8 md:gap-16 items-start"
        >
          <div className="md:col-span-4 md:sticky md:top-32">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-4 flex items-center gap-3">
              <span className="text-white/60 tabular-nums">01</span>
              The day view
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight mb-4">
              The thing you&apos;ll
              <br />
              actually open.
            </h2>
            <p className="text-[13.5px] text-white/55 leading-relaxed">
              A calendar tinted by your P/L, click any day, see what you did
              and why. No CSV exports. No pivot tables. Just the part you
              were going to do in Excel anyway, except you&apos;ll open it.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="md:col-span-8"
          >
            <DayPreviews />
          </motion.div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 02 - QuillAI                                                 */}
        {/* ──────────────────────────────────────────────────────────── */}
        <PreviewSection
          n="02"
          kicker="QuillAI"
          heading={
            <>
              An assistant that has
              <br />
              read your journal.
            </>
          }
          body={
            <>
              Ask in plain English. Cuequill&apos;s AI answers from your trades,
              not the internet&apos;s. It can also log a fresh fill in one
              sentence — &ldquo;log 3 SPY 600 calls at $1.20 expiring
              Friday&rdquo; and it&apos;s in.
            </>
          }
          preview={<QuillAIPreviews />}
        />

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 03 - Numbers                                                 */}
        {/* ──────────────────────────────────────────────────────────── */}
        <PreviewSection
          n="03"
          kicker="Numbers"
          heading={
            <>
              The ones your
              <br />
              broker won&apos;t show you.
            </>
          }
          body={
            <>
              Expectancy. Profit factor. Win rate by strategy, symbol, and
              hour of day. A daily-risk budget you can&apos;t bury. Streak
              counters that nudge you to slow down. Numbers chosen by a
              trader, not picked off a finance API.
            </>
          }
          preview={<NumbersPreviews />}
        />

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 04 - IBKR                                                    */}
        {/* ──────────────────────────────────────────────────────────── */}
        <PreviewSection
          n="04"
          kicker="IBKR"
          heading={
            <>
              One token.
              <br />
              Nightly sync. Forget it.
            </>
          }
          body={
            <>
              Drop a Flex Web Service token in settings. Cuequill imports
              every fill weeknight after close — commissions and taxes
              included. Manual entry still works for backfilled days, and
              QuillAI accepts it as a sentence.
            </>
          }
          preview={<IBKRPreviews />}
        />

        {/* ──────────────────────────────────────────────────────────── */}
        {/* FAQ - accordion, same component language as the pricing page  */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section className="max-w-[760px] mx-auto pb-24 md:pb-32 border-t border-white/10 pt-16 md:pt-20">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center mb-10">
            Questions, before you start.
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.07] overflow-hidden">
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* Closing - a sentence, not a sermon                           */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section className="max-w-[760px] mx-auto pb-32 md:pb-44 border-t border-white/10 pt-20 md:pt-28 text-center">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight leading-[1.1]">
            Your next month doesn&apos;t have to look like last month.
          </h2>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 text-[var(--background)] hover:bg-white transition text-[13.5px] font-semibold"
            >
              Open your journal
              <i className="fa-solid fa-chevron-right text-[10px]" />
            </Link>
            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-full bg-white/[0.06] text-white border border-white/15 hover:bg-white/10 transition text-[13px] inline-flex items-center gap-1.5"
            >
              See pricing
              <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>
          <p className="mt-5 text-[12px] text-white/40">
            Three minutes to set up · invite-only
          </p>
        </section>
      </main>

      {/* Footer - multi-column, matches the pricing page */}
      <footer className="px-6 md:px-10 py-12 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
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
              { label: "Overview", href: "#look" },
              { label: "Pricing", href: "/pricing" },
              { label: "Sign in", href: "/login" },
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              { label: "Quill AI", href: "#look" },
              { label: "IBKR sync", href: "#look" },
            ]}
          />
          <FooterCol
            title="Contact"
            links={[
              { label: "hi@cuequill.app", href: "mailto:hi@cuequill.app" },
            ]}
          />
        </div>
        <div className="max-w-[1200px] mx-auto mt-10 pt-6 border-t border-white/10 text-[11.5px] text-white/35">
          Cuequill · © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────

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

function BuiltOn({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium grayscale opacity-70 hover:opacity-100 transition">
      <i className={`${icon} text-[14px]`} />
      {label}
    </span>
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
            <p className="px-5 pb-4 text-[13px] text-white/55 leading-relaxed">
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

// Section with prose on the left and a product-preview on the right.
// Same orientation across 02/03/04 so the page reads like a single
// editorial spread - the visual variety comes from what's INSIDE the
// preview, not the layout flipping.
function PreviewSection({
  n,
  kicker,
  heading,
  body,
  preview,
}: {
  n: string;
  kicker: string;
  heading: React.ReactNode;
  body: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <section className="max-w-[1200px] mx-auto pb-24 md:pb-32 grid md:grid-cols-12 gap-8 md:gap-16 items-start border-t border-white/10 pt-16 md:pt-20">
      <div className="md:col-span-4 md:sticky md:top-32">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-4 flex items-center gap-3">
          <span className="text-white/60 tabular-nums">{n}</span>
          {kicker}
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight mb-4">
          {heading}
        </h2>
        <p className="text-[13.5px] text-white/55 leading-relaxed">{body}</p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="md:col-span-8"
      >
        {preview}
      </motion.div>
    </section>
  );
}

// A single product preview - the day-trades modal stylized. Not nine
// fake screenshots, not a chat bubble. One concrete object.
function DayPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden">
      <div className="px-5 md:px-6 py-4 md:py-5 border-b border-white/10 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">
            Mon · June 9
          </div>
          <div className="text-[28px] md:text-[34px] font-semibold tabular-nums text-green-300 tracking-tight leading-none">
            +$847.23
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25">
            3W
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/25">
            1L
          </span>
          <span className="text-white/35">75% win rate</span>
        </div>
      </div>
      <div className="divide-y divide-white/[0.06]">
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
            strat: "First Red Opening",
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
            strat: "Bearish Channel Break",
          },
        ].map((t, i) => {
          const w = t.pl >= 0;
          return (
            <div
              key={i}
              className="px-5 md:px-6 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition"
            >
              <span
                className={`w-1 h-8 rounded-full shrink-0 ${
                  w ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="font-semibold text-[14px]">{t.sym}</span>
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
              <div
                className={`font-semibold tabular-nums text-[14px] ${
                  w ? "text-green-300" : "text-red-300"
                }`}
              >
                {w ? "+" : "−"}${Math.abs(t.pl).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 md:px-6 py-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/45">
        <span>Avg per trade <span className="text-white/75 tabular-nums">+$211.81</span></span>
        <span className="tabular-nums">4 trades · 1 PUT · 3 CALLs</span>
      </div>
    </div>
  );
}

// ─── QuillAI preview ─────────────────────────────────────────────────
// Mirrors the real /chat UI: QuillAI eyebrow, right-aligned teal user
// bubbles, left-aligned glass AI bubbles, and the input bar at the
// bottom. Same bubble classes used in src/app/chat/page.tsx so the
// preview reads as the actual product.
function QuillAIPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden flex flex-col">
      {/* Top eyebrow - matches the chat page greeting state. */}
      <div className="px-5 md:px-6 pt-5 pb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[11px] uppercase tracking-[0.15em] font-medium">
          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
          QuillAI
        </div>
        <span className="text-[10.5px] text-white/35 tabular-nums">
          347 trades · read
        </span>
      </div>

      {/* Scroll-area look-alike. Real chat uses the same bubble shapes. */}
      <div className="px-5 md:px-6 py-3 flex flex-col gap-2">
        <Bubble side="user">
          Which strategy is leaking money this month?
        </Bubble>
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

      {/* Decorative input bar - same skeleton as the real /chat input. */}
      <div className="mx-5 md:mx-6 mb-5 mt-2 flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="flex-1 text-[14px] text-white/35 py-1">
          Ask about your last five losses…
        </span>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25">
          <i className="fa-solid fa-arrow-up text-[11px]" />
        </span>
      </div>
    </div>
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
        className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] md:text-[14px] leading-relaxed break-words ${
          isUser
            ? "bg-teal-500/15 text-white border border-teal-500/25"
            : "bg-white/[0.04] text-white/90 border border-white/10"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Numbers preview ─────────────────────────────────────────────────
// A condensed stat card. Big headline expectancy + three secondary
// tiles + a streak/risk strip. Modelled on the redesigned Statistics
// page so it reads as a real surface, not a generic dashboard.
function NumbersPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-white/10 flex items-baseline justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          MTD · all strategies
        </div>
        <div className="text-[11px] text-white/35 tabular-nums">47 closed</div>
      </div>

      {/* Hero stat */}
      <div className="px-5 md:px-6 pt-5 pb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
          Expectancy
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-[40px] md:text-[48px] font-semibold tabular-nums text-green-300 leading-none tracking-tight">
            +$24.18
          </span>
          <span className="text-[12px] text-white/45">per trade</span>
        </div>
      </div>

      {/* Secondary tiles */}
      <div className="px-5 md:px-6 pb-5 pt-3 grid grid-cols-3 gap-3 border-b border-white/10">
        {[
          { k: "Win rate", v: "58%", tone: "good" },
          { k: "Profit factor", v: "2.14", tone: "good" },
          { k: "Max DD", v: "−$612", tone: "bad" },
        ].map((s) => (
          <div
            key={s.k}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1">
              {s.k}
            </div>
            <div
              className={`text-[16px] font-semibold tabular-nums ${
                s.tone === "good" ? "text-green-300" : "text-red-300"
              }`}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Risk-budget bar */}
      <div className="px-5 md:px-6 py-4">
        <div className="flex items-center justify-between mb-2 text-[11px]">
          <span className="text-white/55">Daily risk budget</span>
          <span className="tabular-nums">
            <span className="text-amber-300">$120</span>
            <span className="text-white/30"> / $200</span>
            <span className="text-white/40 ml-1">60% used</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500/80"
            style={{ width: "60%" }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10.5px] text-white/35">
          <span>Streak: 3W active</span>
          <span>Best hour: 14:00 ET</span>
        </div>
      </div>
    </div>
  );
}

// ─── IBKR preview ────────────────────────────────────────────────────
// "What just got imported." A sync-status header + a ticker of the
// last few fills. Concrete - not a setup wizard, not a checklist - the
// thing you actually look at to confirm the sync worked.
function IBKRPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-300">
            <i className="fa-solid fa-arrows-rotate text-[13px]" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              IBKR Auto-sync
            </div>
            <div className="text-[13px] text-white/80 tabular-nums">
              Synced 14m ago
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Connected
        </span>
      </div>

      {/* Last run stats */}
      <div className="px-5 md:px-6 py-4 grid grid-cols-3 gap-3 border-b border-white/10">
        {[
          { k: "Imported", v: "4", tone: "good" },
          { k: "Skipped", v: "0", tone: "neutral" },
          { k: "Next run", v: "22:00 ET", tone: "neutral" },
        ].map((s) => (
          <div key={s.k} className="flex flex-col gap-0.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
              {s.k}
            </div>
            <div
              className={`text-[15px] font-semibold tabular-nums ${
                s.tone === "good"
                  ? "text-green-300"
                  : "text-white/85"
              }`}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Fills ticker */}
      <div>
        <div className="px-5 md:px-6 pt-4 pb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
          Last run
        </div>
        <div className="divide-y divide-white/[0.06]">
          {[
            { sym: "AAPL", opt: "PUT", strike: 230, qty: 3, time: "14:30", price: 1.2 },
            { sym: "SPY", opt: "CALL", strike: 600, qty: 5, time: "13:00", price: 2.85 },
            { sym: "NVDA", opt: "CALL", strike: 140, qty: 2, time: "11:00", price: 0.95 },
            { sym: "TSLA", opt: "CALL", strike: 380, qty: 4, time: "10:30", price: 1.4 },
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
              <span className="ml-auto text-white/55 tabular-nums">
                @ ${t.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Secondary examples ──────────────────────────────────────────────
// Each process shows a second, smaller preview beneath the main one so a
// visitor sees more than one facet of the product per section.

function DayPreviews() {
  return (
    <div className="flex flex-col gap-5">
      <DayPreview />
      <MiniCalendar />
    </div>
  );
}

// A month tinted by P/L - the calendar the copy promises.
function MiniCalendar() {
  const cells: ({ d: number; pl: number } | null)[] = [
    { d: 2, pl: 120 }, { d: 3, pl: -60 }, { d: 4, pl: 340 }, { d: 5, pl: 0 }, { d: 6, pl: 210 },
    { d: 9, pl: 847 }, { d: 10, pl: -180 }, { d: 11, pl: 90 }, { d: 12, pl: 410 }, { d: 13, pl: -55 },
    { d: 16, pl: 60 }, { d: 17, pl: 220 }, { d: 18, pl: -120 }, { d: 19, pl: 300 }, { d: 20, pl: 0 },
    { d: 23, pl: 540 }, { d: 24, pl: -210 }, { d: 25, pl: 130 }, { d: 26, pl: 75 }, { d: 27, pl: 190 },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          June · tinted by P/L
        </div>
        <div className="text-[13px] font-semibold tabular-nums text-green-300">
          +$3,182
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {["M", "T", "W", "T", "F"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] uppercase tracking-wider text-white/30 pb-1"
          >
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c)
            return (
              <div key={i} className="aspect-square rounded-md bg-white/[0.02]" />
            );
          const w = c.pl > 0;
          const l = c.pl < 0;
          return (
            <div
              key={i}
              className={`aspect-square rounded-md border flex flex-col items-center justify-center gap-0.5 ${
                w
                  ? "bg-green-500/12 border-green-500/20"
                  : l
                    ? "bg-red-500/12 border-red-500/20"
                    : "bg-white/[0.03] border-white/10"
              }`}
            >
              <span className="text-[10px] text-white/45 tabular-nums">
                {c.d}
              </span>
              {c.pl !== 0 && (
                <span
                  className={`text-[8.5px] font-semibold tabular-nums ${
                    w ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {w ? "+" : "−"}${Math.abs(c.pl)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuillAIPreviews() {
  return (
    <div className="flex flex-col gap-5">
      <QuillAIPreview />
      <MiniChat />
    </div>
  );
}

// Second QuillAI example: an answer that renders your actual trades.
function MiniChat() {
  const losses = [
    { sym: "NVDA", strike: 140, qty: 2, pl: -118 },
    { sym: "NVDA", strike: 145, qty: 1, pl: -64 },
    { sym: "NVDA", strike: 138, qty: 3, pl: -201 },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] p-5 flex flex-col gap-2">
      <Bubble side="user">Show my last 3 NVDA losses.</Bubble>
      <Bubble side="ai">
        <div className="mb-1.5">
          All <span className="text-green-300 font-semibold">CALL</span>s on Hard
          Floor:
        </div>
        <div className="flex flex-col gap-1.5">
          {losses.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-2.5 py-1.5"
            >
              <span className="font-semibold text-[12.5px] text-white">
                {t.sym}
              </span>
              <span className="text-[10.5px] text-white/45 tabular-nums">
                {t.strike} × {t.qty}
              </span>
              <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-red-300">
                −${Math.abs(t.pl)}
              </span>
            </div>
          ))}
        </div>
      </Bubble>
    </div>
  );
}

function NumbersPreviews() {
  return (
    <div className="flex flex-col gap-5">
      <NumbersPreview />
      <MiniStrategyTable />
    </div>
  );
}

// Second numbers example: win rate + net by strategy.
function MiniStrategyTable() {
  const rows = [
    { name: "MA 40", win: 71, net: 1840 },
    { name: "First Red Opening", win: 64, net: 1120 },
    { name: "Bullish Gap", win: 52, net: 410 },
    { name: "Hard Floor", win: 38, net: -640 },
  ];
  const max = Math.max(...rows.map((r) => Math.abs(r.net)));
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/10 text-[10px] uppercase tracking-[0.22em] text-white/40">
        By strategy · MTD
      </div>
      <div className="divide-y divide-white/[0.06]">
        {rows.map((r, i) => {
          const w = r.net >= 0;
          return (
            <div key={i} className="px-5 py-2.5 flex items-center gap-3">
              <span className="text-[12.5px] text-white/85 w-32 truncate">
                {r.name}
              </span>
              <span className="text-[11px] text-white/40 tabular-nums w-9">
                {r.win}%
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={`h-full rounded-full ${w ? "bg-green-500/70" : "bg-red-500/70"}`}
                  style={{ width: `${(Math.abs(r.net) / max) * 100}%` }}
                />
              </div>
              <span
                className={`text-[12.5px] font-semibold tabular-nums w-16 text-right ${
                  w ? "text-green-300" : "text-red-300"
                }`}
              >
                {w ? "+" : "−"}${Math.abs(r.net)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IBKRPreviews() {
  return (
    <div className="flex flex-col gap-5">
      <IBKRPreview />
      <MiniImported />
    </div>
  );
}

// Second IBKR example: the post-sync review with a duplicate flagged.
function MiniImported() {
  const rows = [
    { sym: "AAPL", opt: "PUT", strike: 230, qty: 3, pl: 285, dup: false },
    { sym: "SPY", opt: "CALL", strike: 600, qty: 5, pl: 420, dup: false },
    { sym: "NVDA", opt: "CALL", strike: 140, qty: 2, pl: -58, dup: true },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/10 flex items-baseline justify-between">
        <span className="text-[14px] font-semibold tracking-tight">
          Imported trades
        </span>
        <span className="text-[11px] text-white/45">
          3 from the last sync · <span className="text-amber-400">1 dup</span>
        </span>
      </div>
      <div className="px-2 py-2 flex flex-col gap-1">
        {rows.map((t, i) => {
          const w = t.pl >= 0;
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition"
            >
              <span
                className={`shrink-0 w-11 text-center text-[10px] font-semibold uppercase tracking-wide py-1 rounded-md ${
                  t.opt === "CALL"
                    ? "bg-green-500/12 text-green-300"
                    : "bg-red-500/12 text-red-300"
                }`}
              >
                {t.opt}
              </span>
              <span className="text-[14px] font-semibold text-white">
                {t.sym}
              </span>
              <span className="text-[12px] text-white/45 tabular-nums">
                {t.strike} × {t.qty}
              </span>
              {t.dup && (
                <i
                  title="Looks like a duplicate of a trade already in your journal."
                  className="fa-solid fa-triangle-exclamation text-amber-400/80 text-[10px]"
                />
              )}
              <span
                className={`ml-auto text-[13.5px] font-semibold tabular-nums ${
                  w ? "text-green-300" : "text-red-300"
                }`}
              >
                {w ? "+" : "−"}${Math.abs(t.pl)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
