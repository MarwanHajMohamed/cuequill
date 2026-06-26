"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PageLoading from "./PageLoading";
import { FaqRow, SiteFooter, SiteHeader } from "./_marketing/Chrome";

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
          align="right"
          heading={
            <>
              A calendar tinted by
              <br />
              your <span className="italic text-teal-300">daily P/L.</span>
            </>
          }
          body="A calendar tinted by your P/L. Click any day, see what you did and why. No CSV exports. No pivot tables. Just the part you were going to do in Excel anyway, except you'll open it."
          stats={[
            ["Loads in", "2s"],
            ["Click to detail", "Yes"],
            ["Net of fees", "Yes"],
          ]}
          preview={<CalendarPreview />}
        />

        <FeatureSpread
          id="quill"
          align="left"
          heading={
            <>
              Ask your trades
              <br />
              anything, in{" "}
              <span className="italic text-teal-300">plain English.</span>
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
          align="right"
          heading={
            <>
              Expectancy, win rate,
              <br />
              <span className="italic text-teal-300">profit factor.</span>
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
          align="left"
          heading={
            <>
              Every IBKR fill,
              <br />
              <span className="italic text-teal-300">synced nightly.</span>
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
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-[40px] sm:text-[60px] md:text-[76px] leading-[0.98] font-medium tracking-[-0.025em]"
          >
            Find the edge{" "}
            <span className="italic font-normal text-teal-300">
              in your own trades.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="mt-8 max-w-md text-[14px] text-white/65 leading-relaxed"
          >
            A calendar tinted by your P/L, an AI that&apos;s read every fill,
            and the numbers your broker won&apos;t show you. Built for
            discretionary US options traders.
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
              <i className="fa-solid fa-chevron-right text-[10px]" />
            </Link>
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
  align,
  heading,
  body,
  stats,
  preview,
}: {
  id: string;
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
          <h2 className="text-[34px] md:text-[48px] leading-[1.04] font-medium tracking-[-0.02em]">
            {heading}
          </h2>

          <p className="mt-6 max-w-md text-[13.5px] text-white/60 leading-relaxed">
            {body}
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-x-4 gap-y-3 max-w-md border-t border-white/10 pt-5">
            {stats.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-[10px] tracking-[0.1em] text-white/35">
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
          <h2 className="text-[32px] md:text-[40px] leading-[1.04] font-medium tracking-[-0.02em]">
            Questions, before
            <br />
            <span className="italic text-teal-300">you start.</span>
          </h2>
          <p className="mt-5 max-w-xs text-[13px] text-white/55 leading-relaxed">
            More on the pricing page, or write directly.
          </p>
          <a
            href="mailto:info@cuequill.com"
            className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-teal-300 hover:text-teal-200 transition"
          >
            info@cuequill.com
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
        <h2 className="text-[36px] sm:text-[52px] md:text-[68px] leading-[0.98] font-medium tracking-[-0.025em] max-w-4xl">
          Your next month doesn&apos;t have to look like{" "}
          <span className="italic text-teal-300">last month.</span>
        </h2>
        <div className="mt-10 flex items-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[13px] font-medium"
          >
            Open your journal
            <i className="fa-solid fa-chevron-right text-[10px]" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition text-[12.5px]"
          >
            See pricing
          </Link>
          <span className="text-[11.5px] tracking-[0.1em] text-white/35 ml-1">
            Three minutes to set up
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Preview animation helpers ──────────────────────────────────────

// Fires `true` the first time the ref's element scrolls into view, then
// stays true. Used to defer expensive animations until the user is
// actually looking at the figure.
function useInViewOnce<T extends HTMLElement>(
  rootMargin = "-80px",
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          ob.disconnect();
        }
      },
      { rootMargin },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [rootMargin, inView]);
  return [ref, inView];
}

// Animates a numeric value from 0 → target on an ease-out curve once
// `active` flips true. Returns the live value each frame.
function useCountUp(target: number, durationMs: number, active: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, active]);
  return v;
}

// Reveals `text` one character at a time once `active` is true. Resets
// (returns "") when active flips back off.
function useTypewriter(text: string, charMs: number, active: boolean) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    let i = 0;
    setOut("");
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, charMs);
    return () => window.clearInterval(id);
  }, [text, charMs, active]);
  return out;
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
    <figure className="relative flex flex-col">
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden shadow-[0_2px_24px_var(--shadow-soft)]">
        {children}
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between text-[10.5px] tracking-[0.12em] text-white/40">
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-teal-400" />
          {caption}
        </span>
        {meta && <span className="tabular-nums">{meta}</span>}
      </figcaption>
    </figure>
  );
}

// Calendar preview - mirrors the dashboard's mini Mon-Fri calendar grid
// so the landing's "calendar tinted by your P/L" section actually shows
// what the product looks like. Static sample month, no live data.
// One mock fill on the sample day. Same shape as the dashboard's
// day-trades modal so the preview reads as a stripped-down version.
type SampleTrade = {
  sym: string;
  opt: "CALL" | "PUT";
  strike: number;
  qty: number;
  pl: number;
  strat: string;
};

function CalendarPreview() {
  type DayCell =
    | {
        day: number;
        kind: "win" | "loss";
        netPL: number;
        trades: SampleTrade[];
      }
    | { day: number; kind: "fed" }
    | { day: number; kind: "today" }
    | { day: number; kind: "empty" };

  // Five weeks, Mon-Fri only. Each trading day carries the actual fills
  // that produced its P/L so clicking the tile can render the day-detail
  // modal with real-looking rows.
  const weeks: DayCell[][] = [
    [
      {
        day: 3,
        kind: "win",
        netPL: 412,
        trades: [
          { sym: "SPY", opt: "CALL", strike: 580, qty: 3, pl: 270, strat: "MA 40" },
          { sym: "QQQ", opt: "CALL", strike: 490, qty: 2, pl: 142, strat: "MA 40" },
        ],
      },
      {
        day: 4,
        kind: "loss",
        netPL: -180,
        trades: [
          { sym: "AAPL", opt: "PUT", strike: 225, qty: 2, pl: -180, strat: "First Red" },
        ],
      },
      {
        day: 5,
        kind: "win",
        netPL: 96,
        trades: [
          { sym: "TSLA", opt: "CALL", strike: 360, qty: 1, pl: 96, strat: "Channel Brk" },
        ],
      },
      { day: 6, kind: "fed" },
      {
        day: 7,
        kind: "win",
        netPL: 612,
        trades: [
          { sym: "NVDA", opt: "CALL", strike: 138, qty: 3, pl: 285, strat: "Bullish Gap" },
          { sym: "SPY", opt: "CALL", strike: 583, qty: 4, pl: 220, strat: "MA 40" },
          { sym: "MSFT", opt: "CALL", strike: 440, qty: 2, pl: 107, strat: "Hard Floor" },
        ],
      },
    ],
    [
      {
        day: 10,
        kind: "win",
        netPL: 245,
        trades: [
          { sym: "AMZN", opt: "CALL", strike: 215, qty: 2, pl: 168, strat: "MA 40" },
          { sym: "META", opt: "CALL", strike: 590, qty: 1, pl: 77, strat: "MA 40" },
        ],
      },
      { day: 11, kind: "empty" },
      {
        day: 12,
        kind: "loss",
        netPL: -312,
        trades: [
          { sym: "TSLA", opt: "PUT", strike: 350, qty: 2, pl: -185, strat: "Gap Floor Brk" },
          { sym: "SPY", opt: "PUT", strike: 575, qty: 1, pl: -127, strat: "Hanger Daily" },
        ],
      },
      {
        day: 13,
        kind: "win",
        netPL: 847,
        trades: [
          { sym: "SPY", opt: "CALL", strike: 600, qty: 5, pl: 420, strat: "MA 40" },
          { sym: "AAPL", opt: "PUT", strike: 230, qty: 3, pl: 285, strat: "First Red" },
          { sym: "NVDA", opt: "CALL", strike: 140, qty: 2, pl: -58, strat: "Bullish Gap" },
          { sym: "TSLA", opt: "CALL", strike: 380, qty: 4, pl: 200, strat: "Channel Brk" },
        ],
      },
      {
        day: 14,
        kind: "win",
        netPL: 192,
        trades: [
          { sym: "MSFT", opt: "CALL", strike: 445, qty: 2, pl: 192, strat: "MA 40" },
        ],
      },
    ],
    [
      {
        day: 17,
        kind: "win",
        netPL: 158,
        trades: [
          { sym: "GOOG", opt: "CALL", strike: 180, qty: 2, pl: 158, strat: "MA 40" },
        ],
      },
      {
        day: 18,
        kind: "win",
        netPL: 502,
        trades: [
          { sym: "SPY", opt: "CALL", strike: 595, qty: 3, pl: 240, strat: "MA 40" },
          { sym: "QQQ", opt: "CALL", strike: 500, qty: 2, pl: 165, strat: "MA 40" },
          { sym: "META", opt: "CALL", strike: 600, qty: 1, pl: 97, strat: "Bullish Gap" },
        ],
      },
      {
        day: 19,
        kind: "loss",
        netPL: -94,
        trades: [
          { sym: "AAPL", opt: "PUT", strike: 220, qty: 1, pl: -94, strat: "First Red" },
        ],
      },
      { day: 20, kind: "empty" },
      {
        day: 21,
        kind: "win",
        netPL: 380,
        trades: [
          { sym: "NVDA", opt: "CALL", strike: 142, qty: 3, pl: 235, strat: "Bullish Gap" },
          { sym: "TSLA", opt: "CALL", strike: 385, qty: 2, pl: 145, strat: "Channel Brk" },
        ],
      },
    ],
    [
      { day: 24, kind: "today" },
      { day: 25, kind: "empty" },
      { day: 26, kind: "empty" },
      { day: 27, kind: "empty" },
      { day: 28, kind: "empty" },
    ],
  ];

  const compact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000) return `${n < 0 ? "−" : "+"}$${(abs / 1000).toFixed(1)}K`;
    return `${n < 0 ? "−" : "+"}$${abs.toFixed(0)}`;
  };

  // Which weekday name a given November-2025 weekday corresponds to,
  // for the modal header line. Nov 1, 2025 is a Saturday → 3rd is Mon.
  const weekdayName = (day: number) => {
    const dow = (day - 3) % 5; // 0=Mon..4=Fri
    return ["Mon", "Tue", "Wed", "Thu", "Fri"][((dow % 5) + 5) % 5];
  };

  const [openDay, setOpenDay] = useState<number | null>(null);
  const openCell = openDay
    ? weeks.flat().find((c) => c.day === openDay && (c.kind === "win" || c.kind === "loss"))
    : null;
  const openTradeable =
    openCell && (openCell.kind === "win" || openCell.kind === "loss")
      ? openCell
      : null;

  return (
    <PreviewClipping caption="Day view" meta="Nov 2025">
      {/* Header row - month label + month-to-date P/L */}
      <div className="px-5 md:px-6 py-5 border-b border-[var(--rule)] flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.12em] text-white/40 mb-1.5">
            November
          </p>
          <p className="text-[28px] md:text-[32px] leading-none tabular-nums text-green-300 tracking-[-0.02em] font-medium">
            +$2,666
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25">
            10W
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/25">
            3L
          </span>
          <span className="text-white/40">77% Win rate</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="px-3 md:px-4 py-4">
        {/* Weekday labels */}
        <div className="grid grid-cols-5 gap-1.5 mb-2 px-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <div
              key={d}
              className="text-[9px] tracking-[0.1em] text-white/35 text-left"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day tiles */}
        <div className="flex flex-col gap-1.5">
          {weeks.map((row, i) => (
            <div key={i} className="grid grid-cols-5 gap-1.5">
              {row.map((cell, j) => {
                const base =
                  "relative h-[58px] md:h-[64px] rounded-md border px-2 py-1.5 flex flex-col text-left transition";
                if (cell.kind === "win") {
                  return (
                    <button
                      type="button"
                      key={j}
                      onClick={() => setOpenDay(cell.day)}
                      aria-label={`Open ${cell.trades.length} trade${cell.trades.length === 1 ? "" : "s"} on Nov ${cell.day}`}
                      className={`${base} bg-green-500/10 border-green-500/15 hover:bg-green-500/20 hover:border-green-500/30 cursor-pointer`}
                    >
                      <span className="text-[10px] text-white/55 tabular-nums">
                        {cell.day}
                      </span>
                      <span className="mt-auto text-[11px] font-semibold tabular-nums text-green-300 leading-none">
                        {compact(cell.netPL)}
                      </span>
                      <span className="text-[9px] text-white/35 tabular-nums leading-none mt-0.5">
                        {cell.trades.length}{" "}
                        {cell.trades.length === 1 ? "trade" : "trades"}
                      </span>
                    </button>
                  );
                }
                if (cell.kind === "loss") {
                  return (
                    <button
                      type="button"
                      key={j}
                      onClick={() => setOpenDay(cell.day)}
                      aria-label={`Open ${cell.trades.length} trade${cell.trades.length === 1 ? "" : "s"} on Nov ${cell.day}`}
                      className={`${base} bg-red-500/10 border-red-500/15 hover:bg-red-500/20 hover:border-red-500/30 cursor-pointer`}
                    >
                      <span className="text-[10px] text-white/55 tabular-nums">
                        {cell.day}
                      </span>
                      <span className="mt-auto text-[11px] font-semibold tabular-nums text-red-300 leading-none">
                        {compact(cell.netPL)}
                      </span>
                      <span className="text-[9px] text-white/35 tabular-nums leading-none mt-0.5">
                        {cell.trades.length}{" "}
                        {cell.trades.length === 1 ? "trade" : "trades"}
                      </span>
                    </button>
                  );
                }
                if (cell.kind === "fed") {
                  return (
                    <div
                      key={j}
                      className={`${base} bg-white/[0.02] border-white/10`}
                    >
                      <span className="text-[10px] text-white/55 tabular-nums">
                        {cell.day}
                      </span>
                      <span className="absolute top-1 right-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/35 text-purple-100 border border-purple-400/60 text-[7.5px] font-bold tracking-wide leading-none">
                        <span
                          className="w-1 h-1 rounded-full bg-purple-200"
                          aria-hidden
                        />
                        Fed
                      </span>
                    </div>
                  );
                }
                if (cell.kind === "today") {
                  return (
                    <div
                      key={j}
                      className={`${base} bg-teal-500/[0.06] border-teal-500/40`}
                    >
                      <span className="text-[10px] text-teal-200 tabular-nums">
                        {cell.day}
                      </span>
                      <span className="mt-auto text-[10px] tracking-[0.1em] text-teal-300 leading-none font-medium">
                        Today
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={j}
                    className={`${base} bg-transparent border-white/[0.06]`}
                  >
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {cell.day}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 md:px-6 py-3 border-t border-[var(--rule)] flex items-center justify-between text-[10.5px] text-white/45 tracking-[0.1em]">
        <span>
          Best{" "}
          <span className="text-green-300 tabular-nums normal-case tracking-normal">
            +$847
          </span>
        </span>
        <span className="tabular-nums">14 traded</span>
      </div>

      {/* Day-trades overlay - opens over the figure when a tile is
          clicked. Simplified version of the dashboard's DayTradesModal:
          backdrop + glass card pinned to the bottom of the figure. */}
      <DayTradesOverlay
        open={openTradeable !== null}
        onClose={() => setOpenDay(null)}
        day={openTradeable?.day ?? null}
        weekday={openTradeable ? weekdayName(openTradeable.day) : null}
        netPL={openTradeable?.netPL ?? 0}
        trades={openTradeable?.trades ?? []}
      />
    </PreviewClipping>
  );
}

// Lightweight day-trades modal used by CalendarPreview. Stays inside
// the PreviewClipping figure so it doesn't blanket the page - just the
// preview itself dims, the card slides up over the calendar grid.
function DayTradesOverlay({
  open,
  onClose,
  day,
  weekday,
  netPL,
  trades,
}: {
  open: boolean;
  onClose: () => void;
  day: number | null;
  weekday: string | null;
  netPL: number;
  trades: SampleTrade[];
}) {
  const positive = netPL >= 0;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="absolute inset-0 z-10 flex items-end justify-center bg-[var(--background)]/60 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full m-3 md:m-4 max-w-[440px] rounded-xl border border-white/12 bg-[var(--background)]/95 shadow-[0_24px_60px_var(--shadow)] overflow-hidden"
          >
            {/* Modal header */}
            <div className="px-4 md:px-5 py-3.5 border-b border-[var(--rule)] flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <p className="text-[10px] tracking-[0.12em] text-white/40">
                  {weekday} · Nov {day}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-white/50 hover:text-white transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-[12px]" />
              </button>
            </div>
            <div className="px-4 md:px-5 pt-3 pb-2 flex items-baseline justify-between">
              <p
                className={`text-[26px] md:text-[30px] leading-none tabular-nums tracking-[-0.02em] font-medium ${
                  positive ? "text-green-300" : "text-red-300"
                }`}
              >
                {positive ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
              </p>
              <span className="text-[10.5px] tracking-[0.1em] text-white/40 tabular-nums">
                {trades.length} {trades.length === 1 ? "trade" : "trades"}
              </span>
            </div>

            {/* Trade rows */}
            <div className="divide-y divide-[var(--rule)] max-h-[260px] overflow-y-auto">
              {trades.map((t, i) => {
                const w = t.pl >= 0;
                return (
                  <div
                    key={i}
                    className="px-4 md:px-5 py-2.5 flex items-center gap-3"
                  >
                    <span
                      className={`w-0.5 h-7 rounded-full shrink-0 ${
                        w ? "bg-green-400" : "bg-red-400"
                      }`}
                    />
                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                      <span className="font-semibold text-[12.5px]">
                        {t.sym}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-full border ${
                          t.opt === "CALL"
                            ? "bg-green-500/10 text-green-300 border-green-500/25"
                            : "bg-red-500/10 text-red-300 border-red-500/25"
                        }`}
                      >
                        {t.opt}
                      </span>
                      <span className="text-[10.5px] text-white/40 tabular-nums">
                        {t.strike} × {t.qty}
                      </span>
                      <span className="text-[10.5px] text-white/30 truncate hidden sm:inline ml-0.5">
                        · {t.strat}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums text-[12.5px] font-medium ${
                        w ? "text-green-300" : "text-red-300"
                      }`}
                    >
                      {w ? "+" : "−"}${Math.abs(t.pl).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Quill AI preview - one full chat exchange played as a sequence on
// scroll-in: user question is typed into the composer, then "sent" as a
// chat bubble, Quill thinks (animated dots), then the answer typewrites
// into a bubble. Second exchange follows after a beat. The whole thing
// runs once - no looping - so it doesn't compete with the rest of the
// page for attention.
function QuillAIPreview() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  type Step =
    | { kind: "typing-user"; text: string; durMs: number }
    | { kind: "sent-user"; text: string; durMs: number }
    | { kind: "thinking"; durMs: number }
    | { kind: "ai-answer"; text: string; durMs: number };

  // Each step has a duration; on completion we advance to the next.
  const script: Step[] = [
    {
      kind: "typing-user",
      text: "Which strategy is leaking money this month?",
      durMs: 1800,
    },
    {
      kind: "sent-user",
      text: "Which strategy is leaking money this month?",
      durMs: 350,
    },
    { kind: "thinking", durMs: 900 },
    {
      kind: "ai-answer",
      text:
        "Hard Floor — 10 closed this month, 40% win rate, expectancy −$18.40/trade. Want to see them?",
      durMs: 2200,
    },
    {
      kind: "typing-user",
      text: "Log 3 SPY 600 CALL at $1.20 expiring Friday.",
      durMs: 1700,
    },
    {
      kind: "sent-user",
      text: "Log 3 SPY 600 CALL at $1.20 expiring Friday.",
      durMs: 350,
    },
    { kind: "thinking", durMs: 700 },
    {
      kind: "ai-answer",
      text:
        "Saved. 3× SPY 600 CALL opened today at $1.20/contract, expiring 2026-06-13.",
      durMs: 1900,
    },
  ];

  const [step, setStep] = useState(0);
  // Accumulated history of completed bubbles - kept around once a step
  // moves past `sent-user` or `ai-answer` so the chat builds up.
  const history: { side: "user" | "ai"; text: string }[] = [];
  for (let i = 0; i < step; i++) {
    const s = script[i];
    if (s.kind === "sent-user") history.push({ side: "user", text: s.text });
    if (s.kind === "ai-answer") history.push({ side: "ai", text: s.text });
  }
  const current = step < script.length ? script[step] : null;

  // Advance through script once the figure has scrolled into view.
  useEffect(() => {
    if (!inView || !current) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), current.durMs);
    return () => window.clearTimeout(t);
  }, [inView, step, current]);

  // The composer mirrors whatever the user is currently typing. Once
  // the message is sent it clears, then waits for the next typing step.
  const composerText =
    current?.kind === "typing-user" ? "" : ""; // start empty - typewriter feeds it
  const typing = current?.kind === "typing-user" ? current.text : "";
  const composer = useTypewriter(typing, 32, inView && !!typing);
  const showCaret = !!typing;

  return (
    <PreviewClipping caption="Quill AI" meta="347 trades read">
      <div ref={ref} className="px-5 md:px-6 pt-5 pb-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[11px] tracking-[0.08em] font-medium">
          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
          Quill AI
        </div>
      </div>

      {/* Chat transcript - fixed-height window so the composer doesn't
          jump as bubbles fade in. */}
      <div className="px-5 md:px-6 py-3 flex flex-col gap-2 min-h-[260px] md:min-h-[280px]">
        {history.map((b, i) => (
          <Bubble key={i} side={b.side}>
            {b.text}
          </Bubble>
        ))}
        {current?.kind === "thinking" && (
          <Bubble side="ai">
            <ThinkingDots />
          </Bubble>
        )}
        {current?.kind === "ai-answer" && (
          <AnimatedAiBubble text={current.text} />
        )}
      </div>

      {/* Composer - the typing step feeds characters in here, clears on
          send, idle the rest of the time. Trailing block-caret blinks
          while typing for the "this is actually being typed" feel. */}
      <div className="mx-5 md:mx-6 mb-5 mt-2 flex items-end gap-2 rounded-2xl border border-[var(--rule)] bg-white/[0.04] px-3 py-2">
        <span className="flex-1 text-[13.5px] py-1 min-h-[1.4em] flex items-center">
          {showCaret ? (
            <>
              <span className="text-white/90">{composer || composerText}</span>
              <span className="ml-0.5 inline-block w-[6px] h-[14px] bg-teal-300 animate-pulse" />
            </>
          ) : (
            <span className="text-white/40 italic">
              Ask about your last five losses…
            </span>
          )}
        </span>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25">
          <i className="fa-solid fa-chevron-up text-[11px]" />
        </span>
      </div>
    </PreviewClipping>
  );
}

// Three bouncing dots for the "Quill is thinking" beat.
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.15,
          }}
          className="w-1.5 h-1.5 rounded-full bg-white/60"
        />
      ))}
    </span>
  );
}

// AI bubble that typewrites its text once mounted. Used for the
// "answer" steps so the response appears to be streaming in.
function AnimatedAiBubble({ text }: { text: string }) {
  const out = useTypewriter(text, 18, true);
  return (
    <Bubble side="ai">
      {out}
      {out.length < text.length && (
        <span className="ml-0.5 inline-block w-[6px] h-[12px] -mb-[1px] bg-white/50 align-middle animate-pulse" />
      )}
    </Bubble>
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

// Numbers preview - every figure counts up from zero and the risk
// budget bar fills smoothly the first time the figure enters the
// viewport. Hits the "trader cockpit" feel without auto-replaying.
function NumbersPreview() {
  const [ref, active] = useInViewOnce<HTMLDivElement>();

  const expectancy = useCountUp(24.18, 1400, active);
  const winRate = useCountUp(58, 1300, active);
  const profitFactor = useCountUp(2.14, 1300, active);
  const maxDD = useCountUp(612, 1300, active);
  const riskUsed = useCountUp(120, 1500, active);
  // Bar width tracks risk-used / risk-cap so the visual fill stays in
  // lock-step with the spoken number above it.
  const barPct = (riskUsed / 200) * 100;

  return (
    <PreviewClipping caption="Statistics" meta="MTD">
      <div ref={ref} className="px-5 md:px-6 pt-5 pb-2">
        <p className="text-[10px] tracking-[0.12em] text-white/40 mb-1">
          Expectancy
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-[54px] md:text-[68px] leading-none tabular-nums text-green-300 tracking-[-0.025em] font-medium">
            +${expectancy.toFixed(2)}
          </span>
          <span className="text-[11px] tracking-[0.08em] text-white/45">
            / trade
          </span>
        </div>
      </div>

      <div className="px-5 md:px-6 pb-5 pt-4 grid grid-cols-3 gap-3 border-b border-[var(--rule)]">
        {[
          {
            k: "Win rate",
            v: `${Math.round(winRate)}%`,
            tone: "good" as const,
          },
          {
            k: "Profit factor",
            v: profitFactor.toFixed(2),
            tone: "good" as const,
          },
          {
            k: "Max DD",
            v: `−$${Math.round(maxDD)}`,
            tone: "bad" as const,
          },
        ].map((s) => (
          <div
            key={s.k}
            className="border border-[var(--rule)] bg-white/[0.025] p-3 rounded-xl"
          >
            <p className="text-[10px] tracking-[0.08em] text-white/40 mb-1">
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
          <span className="text-white/55 tracking-[0.08em]">
            Daily risk budget
          </span>
          <span className="tabular-nums">
            <span className="text-amber-300">${Math.round(riskUsed)}</span>
            <span className="text-white/30"> / $200</span>
            <span className="text-white/40 ml-1.5 tracking-[0.12em] text-[10px]">
              {Math.round(barPct)}% used
            </span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          {/* CSS transition makes the bar fill smoothly each frame as
              `barPct` ticks up from the count-up hook. */}
          <div
            className="h-full rounded-full bg-amber-500/80"
            style={{
              width: `${barPct}%`,
              transition: "width 60ms linear",
            }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10.5px] tracking-[0.08em] text-white/35">
          <span>Streak: 3W active</span>
          <span>Best hour: 14:00 ET</span>
        </div>
      </div>
    </PreviewClipping>
  );
}

// IBKR preview - starts in a "Syncing…" state with the rotate icon
// spinning and a progress bar filling, then flips to "Connected", the
// count cards animate, and the fill rows fade in one by one.
function IBKRPreview() {
  const [ref, active] = useInViewOnce<HTMLDivElement>();

  const SYNC_MS = 1800;
  const [phase, setPhase] = useState<"syncing" | "done">("syncing");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SYNC_MS);
      setProgress(t * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPhase("done");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // Once sync finishes, count up the result tiles together.
  const imported = useCountUp(4, 800, phase === "done");

  const fills = [
    { sym: "AAPL", opt: "PUT", strike: 230, qty: 3, time: "14:30", price: 1.2 },
    { sym: "SPY", opt: "CALL", strike: 600, qty: 5, time: "13:00", price: 2.85 },
    { sym: "NVDA", opt: "CALL", strike: 140, qty: 2, time: "11:00", price: 0.95 },
    { sym: "TSLA", opt: "CALL", strike: 380, qty: 4, time: "10:30", price: 1.4 },
  ];

  return (
    <PreviewClipping caption="IBKR sync" meta="last run 22:00 ET">
      {/* Header - icon spins while syncing, status pill flips when done */}
      <div
        ref={ref}
        className="px-5 md:px-6 py-4 border-b border-[var(--rule)] flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-300">
            <motion.i
              className="fa-solid fa-arrows-rotate text-[13px]"
              animate={phase === "syncing" ? { rotate: 360 } : { rotate: 0 }}
              transition={
                phase === "syncing"
                  ? { duration: 1.1, repeat: Infinity, ease: "linear" }
                  : { duration: 0.3 }
              }
            />
          </span>
          <div>
            <p className="text-[10px] tracking-[0.12em] text-white/40">
              IBKR auto-sync
            </p>
            <p className="text-[13px] text-white/80 tabular-nums">
              {phase === "syncing" ? "Pulling last session…" : "Synced just now"}
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {phase === "syncing" ? (
            <motion.span
              key="syncing"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[10.5px] tracking-[0.08em] font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              Syncing
            </motion.span>
          ) : (
            <motion.span
              key="connected"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 text-[10.5px] tracking-[0.08em] font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar - lives directly under the header, fades out
          once sync completes so the layout below it doesn't shift. */}
      <AnimatePresence>
        {phase === "syncing" && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-[var(--rule)]"
          >
            <div className="px-5 md:px-6 py-3">
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-400/80"
                  style={{
                    width: `${progress}%`,
                    transition: "width 60ms linear",
                  }}
                />
              </div>
              <div className="mt-1.5 text-[10px] tracking-[0.08em] text-white/35 tabular-nums">
                {Math.round(progress)}% · contacting IBKR Flex
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count tiles - rendered always so the box doesn't reflow on
          completion; values animate from 0 once `phase === "done"`. */}
      <div className="px-5 md:px-6 py-4 grid grid-cols-3 gap-3 border-b border-[var(--rule)]">
        {[
          {
            k: "Imported",
            v: phase === "done" ? Math.round(imported).toString() : "—",
            tone: "good" as const,
          },
          { k: "Skipped", v: phase === "done" ? "0" : "—", tone: "neutral" as const },
          { k: "Next run", v: "22:00 ET", tone: "neutral" as const },
        ].map((s) => (
          <div key={s.k} className="flex flex-col gap-0.5">
            <p className="text-[10px] tracking-[0.08em] text-white/40">
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

      {/* Last-run fills - stagger in one by one after sync, like a real
          tail of broker fills landing. */}
      <div>
        <p className="px-5 md:px-6 pt-4 pb-2 text-[10px] tracking-[0.12em] text-white/40">
          Last run · fills
        </p>
        <div className="divide-y divide-[var(--rule)] min-h-[180px]">
          <AnimatePresence>
            {phase === "done" &&
              fills.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    ease: "easeOut",
                    delay: i * 0.18,
                  }}
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
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </PreviewClipping>
  );
}
