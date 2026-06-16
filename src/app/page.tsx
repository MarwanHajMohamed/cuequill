"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
        <section className="max-w-[1200px] mx-auto pt-36 md:pt-48 pb-20 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="grid md:grid-cols-12 gap-8 md:gap-12 items-end"
          >
            <div className="md:col-span-8">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-6 flex items-center gap-3">
                <span className="w-6 h-px bg-white/30" />
                Cuequill · v0.1
              </div>
              <h1 className="text-[40px] sm:text-[60px] md:text-[88px] font-semibold leading-[0.95] tracking-[-0.02em]">
                A discretionary
                <br />
                options journal
                <br />
                that <em className="font-normal text-teal-300">remembers</em>
                <br />
                for you.
              </h1>
            </div>

            <div className="md:col-span-4 md:pb-3">
              <p className="text-[14px] md:text-[15px] text-white/55 leading-relaxed mb-6 max-w-sm">
                Built for traders who keep meaning to read their journal and
                never do. IBKR-synced, AI-queryable, opinionated about which
                numbers actually matter.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 text-[var(--background)] hover:bg-white transition text-[13.5px] font-semibold"
                >
                  Sign in
                  <i className="fa-solid fa-chevron-right text-[10px]" />
                </Link>
                <a
                  href="#look"
                  className="text-[13px] text-white/55 hover:text-white transition inline-flex items-center gap-1.5"
                >
                  See it first
                  <i className="fa-solid fa-arrow-down text-[10px]" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Stamps row - tabular, deliberately understated. */}
          <div className="mt-16 md:mt-24 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-[11.5px]">
            <Stamp k="Built for" v="US options · IBKR" />
            <Stamp k="Imports from" v="Flex Web Service" />
            <Stamp k="AI by" v="Google Gemini" />
            <Stamp k="Available" v="Invite-only" />
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
            <DayPreview />
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
          preview={<QuillAIPreview />}
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
          preview={<NumbersPreview />}
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
          preview={<IBKRPreview />}
        />

        {/* ──────────────────────────────────────────────────────────── */}
        {/* Closing - a sentence, not a sermon                           */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section className="max-w-[900px] mx-auto pb-32 md:pb-44 border-t border-white/10 pt-20 md:pt-28">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight leading-[1.1] max-w-2xl">
            Your next month doesn&apos;t have to look like last month.
          </h2>
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 text-[var(--background)] hover:bg-white transition text-[13.5px] font-semibold"
            >
              Open your journal
              <i className="fa-solid fa-chevron-right text-[10px]" />
            </Link>
            <span className="text-[12px] text-white/40">
              Three minutes to set up · invite-only
            </span>
          </div>
        </section>
      </main>

      {/* Footer - quiet, single row */}
      <footer className="px-6 md:px-10 py-8 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-[11.5px] text-white/40">
          <div className="flex items-center gap-2">
            <CuequillLogo className="h-4 w-auto opacity-70" />
            <span>Cuequill · © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="mailto:hi@cuequill.app"
              className="hover:text-white transition"
            >
              Contact
            </a>
            <a
              href="https://ai.google.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              AI by Gemini
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────

function Stamp({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="uppercase tracking-[0.18em] text-white/35 text-[10px]">
        {k}
      </span>
      <span className="text-white/80 tabular-nums">{v}</span>
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
