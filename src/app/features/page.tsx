"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import {
  SectionMark,
  SiteFooter,
  SiteHeader,
  Standfirst,
} from "../_marketing/Chrome";

// ─── Data ────────────────────────────────────────────────────────────

type Tier = "Free" | "Pro";

type Feature = {
  title: string;
  body: string;
  tiers: Tier[]; // Plans this feature ships on
  detail?: string; // Optional short tabular-data subtitle
};

type FeatureGroup = {
  n: string;
  label: string;
  heading: React.ReactNode;
  lede: string;
  items: Feature[];
};

const GROUPS: FeatureGroup[] = [
  {
    n: "I",
    label: "Logging",
    heading: (
      <>
        Put a trade in once.{" "}
        <span className="italic text-teal-300">Keep it forever.</span>
      </>
    ),
    lede: "Two ways in — by hand or from your broker. Both end up in the same journal, deduped, with commissions and taxes already counted.",
    items: [
      {
        title: "Manual entry",
        body: "Symbol, direction, contract, qty, strike, dates, P/L. Fields validate as you type and the form remembers where you were the next time you open it.",
        detail: "5 fields · ⌘+Enter to save",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Plain-English logging",
        body: "Tell Quill AI a sentence — 'log 3 SPY 600 calls at $1.20 expiring Friday' — and the trade lands in your journal, ready to edit.",
        detail: "Via Quill AI · Pro",
        tiers: ["Pro"],
      },
      {
        title: "IBKR Flex auto-sync",
        body: "Drop your Flex Web Service token in settings. Cuequill imports every fill weeknight after close, commissions and taxes folded in, duplicates flagged before they're saved.",
        detail: "Nightly · ~3 min setup",
        tiers: ["Pro"],
      },
      {
        title: "Tags",
        body: "Mark trades with the mistake you made or the thing you did right. Tags drive the mistake leaderboard and the per-tag stats on the statistics page.",
        detail: "Mistake / good · per trade",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Trade notes",
        body: "A textarea per trade. ⌘+Enter saves; Esc closes. Word count and unsaved-state pill sit in the corner so you don't lose anything.",
        detail: "Markdown supported",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Simulated mode",
        body: "A switch on every trade and a global toggle. Try a setup without polluting your real journal — simulated trades are filtered out of every stat by default.",
        detail: "Per-trade switch",
        tiers: ["Free", "Pro"],
      },
    ],
  },
  {
    n: "II",
    label: "Review",
    heading: (
      <>
        The part you{" "}
        <span className="italic text-teal-300">were going to do</span> in Excel.
      </>
    ),
    lede: "A calendar that loads in two seconds, a day modal with every fill, and a statistics page that actually filters.",
    items: [
      {
        title: "P/L calendar",
        body: "Every trading day tinted by net P/L. Weekends collapsed, Fed days flagged, mobile swipe between months. Open a day and see what you did and why.",
        detail: "Mon–Fri grid · Net of fees",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Day modal",
        body: "Big net P/L at the top, every fill underneath with direction chip, strike × qty, strategy, and a green/red gutter. One click to edit the trade in place.",
        detail: "Click any day",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Statistics page",
        body: "Expectancy, profit factor, win rate, R:R, streaks. Slice by symbol, strategy, period, or all four at once. Headline tiles and a monthly section walk side-by-side with an equity curve.",
        detail: "Per strategy · per symbol",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Trades table",
        body: "Reorder and hide columns. Filters slide in from the side and live in the URL — so you can share a view or come back to it. Pagination is keyboard-friendly.",
        detail: "Customisable · URL-stateful",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Dashboard insights",
        body: "Three at-a-glance tiles below the calendar: a daily-risk budget bar, a top/bottom strategy edge ranking, and a mistake leaderboard of your costliest tags.",
        detail: "Lives on the dashboard",
        tiers: ["Pro"],
      },
      {
        title: "Equity curve",
        body: "Cumulative net P/L over time, with hover totals. Shows the trajectory you wouldn't see by reading individual trades.",
        detail: "All-time · in £/$",
        tiers: ["Pro"],
      },
    ],
  },
  {
    n: "III",
    label: "Quill AI",
    heading: (
      <>
        An assistant that has{" "}
        <span className="italic text-teal-300">read your journal.</span>
      </>
    ),
    lede: "Plain-English questions against your own trades — analysis, comparisons, mistake-spotting, fresh fills.",
    items: [
      {
        title: "Ask anything",
        body: "Which strategy is leaking money this month? What did my last five losses have in common? Quill AI answers from your data, not the internet's.",
        detail: "25 credits / mo Starter · 500 / mo Pro",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Reads imported fills",
        body: "Quill AI sees every IBKR-imported fill alongside your manual entries. No copy-paste between tools.",
        detail: "Pro only",
        tiers: ["Pro"],
      },
      {
        title: "Performance analysis",
        body: "Group by strategy, symbol, day-of-week, time-of-day. Quill returns the cuts that matter, not a wall of numbers.",
        detail: "Free: basic · Pro: full",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Pattern & mistake spotting",
        body: "Ask 'what did my last five losses have in common' and Quill cross-references your tags, hour, symbol, and strategy to call out the pattern.",
        detail: "Pro only",
        tiers: ["Pro"],
      },
      {
        title: "Rule-adherence checks",
        body: "Quill knows your rules board. Ask whether yesterday's trades followed them and it'll tell you which ones broke which rule.",
        detail: "Reads your rules",
        tiers: ["Pro"],
      },
      {
        title: "Threads & history",
        body: "Conversations save automatically. Come back to a question, ask a follow-up. Trade context is re-read each time so answers stay current.",
        detail: "Pro only",
        tiers: ["Pro"],
      },
    ],
  },
  {
    n: "IV",
    label: "Reference",
    heading: (
      <>
        The playbook you{" "}
        <span className="italic text-teal-300">stop forgetting.</span>
      </>
    ),
    lede: "Strategy schematics, a rules board, and a daily affirmation page — the bits of trading discipline you keep meaning to write down.",
    items: [
      {
        title: "Strategy playbook",
        body: "Eleven discretionary US-options setups with schematics, entry rules, and worked chart examples. Tag your trades against them.",
        detail: "11 setups · CALL & PUT",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Rules board",
        body: "Your own rules, organized in sections. Edit inline, drag to reorder, link from Quill AI when you ask about rule-adherence.",
        detail: "Sections · inline editor",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Affirmations",
        body: "A short daily-discipline ritual. Tick through the affirmations before the open so the rules are fresh in your head, not just on paper.",
        detail: "Daily ritual",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Goals",
        body: "Set monthly and daily P/L targets. Progress bars on the dashboard and an at-a-glance trajectory through the month.",
        detail: "Monthly + daily",
        tiers: ["Free", "Pro"],
      },
    ],
  },
  {
    n: "V",
    label: "Surface",
    heading: (
      <>
        Feels right{" "}
        <span className="italic text-teal-300">where you trade.</span>
      </>
    ),
    lede: "Native-feeling on mobile, theme-aware, and built to stay out of the way when you're at the screen.",
    items: [
      {
        title: "Light & dark themes",
        body: "Toggle between dark (default) and a true light theme — colors, hairlines, shadows, and accents all flip. Persists across sessions.",
        detail: "One-click switch",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Installable PWA",
        body: "Add to your home screen on iOS or Android. Full-screen, floating bottom tab bar, swipe-to-change-month gestures, offline cache.",
        detail: "iOS · Android",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Keyboard shortcuts",
        body: "⌘+Enter to save in any modal, Esc to close, slash-keys to jump between pages on desktop.",
        detail: "Modal-aware",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Private by default",
        body: "Trades scoped to your account. IBKR token encrypted at rest. Quill AI only reads your own trades.",
        detail: "Bank-grade encryption",
        tiers: ["Free", "Pro"],
      },
    ],
  },
];

// ─── Page ────────────────────────────────────────────────────────────

export default function FeaturesPage() {
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

  const totalFeatures = GROUPS.reduce((s, g) => s + g.items.length, 0);

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
        <Standfirst
          left={`Features Index · ${today}`}
          right={`${totalFeatures} entries · ${GROUPS.length} sections`}
        />

        <FeaturesHero />

        {GROUPS.map((g) => (
          <FeatureGroupSection key={g.n} group={g} />
        ))}

        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function FeaturesHero() {
  return (
    <section className="border-b border-[var(--rule)] px-6 md:px-10">
      <div className="max-w-[1200px] mx-auto py-20 md:py-28 flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-[10.5px] uppercase tracking-[0.24em] text-white/45 mb-8 flex items-center gap-3"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400" />
          Features
          <span className="h-px w-10 bg-[var(--rule)]" />
          <span className="text-white/30">Full read</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-[44px] sm:text-[64px] md:text-[86px] leading-[0.94] font-medium tracking-[-0.025em] max-w-4xl"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Everything in the journal,{" "}
          <span className="italic font-normal text-teal-300">
            on one page.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="mt-8 max-w-xl text-[14px] text-white/65 leading-relaxed"
        >
          Five groups, twenty-six entries. What's free, what's Pro, and what
          you can ask Quill AI to do for you in plain English. Pricing
          supplement&apos;s next door.
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
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition text-[12.5px]"
          >
            See pricing
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Group section ──────────────────────────────────────────────────

function FeatureGroupSection({ group }: { group: FeatureGroup }) {
  return (
    <section className="border-b border-[var(--rule)] px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-10 md:gap-12 items-start">
        {/* Group head (sticky) */}
        <div className="md:col-span-4 md:sticky md:top-28 self-start">
          <SectionMark n={group.n} label={group.label} />
          <h2
            className="mt-8 text-[32px] md:text-[40px] leading-[1.04] font-medium tracking-[-0.02em]"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            {group.heading}
          </h2>
          <p className="mt-5 max-w-sm text-[13px] text-white/55 leading-relaxed">
            {group.lede}
          </p>
          <p className="mt-6 text-[10.5px] uppercase tracking-[0.22em] text-white/35 tabular-nums">
            {group.items.length} entries
          </p>
        </div>

        {/* Feature list */}
        <ol className="md:col-span-8 md:border-l md:border-[var(--rule)] md:pl-10 divide-y divide-[var(--rule)]">
          {group.items.map((f, i) => (
            <FeatureRow key={f.title} feature={f} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.04 }}
      className="grid grid-cols-12 gap-4 py-6 md:py-7"
    >
      {/* Counter */}
      <span className="col-span-2 md:col-span-1 text-[11px] uppercase tracking-[0.16em] text-teal-300 tabular-nums pt-1">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Title + body */}
      <div className="col-span-10 md:col-span-8">
        <h3 className="text-[20px] md:text-[22px] leading-[1.15] tracking-[-0.01em] font-medium">
          {feature.title}
        </h3>
        <p className="mt-2 text-[13px] text-white/60 leading-relaxed max-w-xl">
          {feature.body}
        </p>
        {feature.detail && (
          <p className="mt-3 text-[10.5px] uppercase tracking-[0.18em] text-white/35 tabular-nums">
            {feature.detail}
          </p>
        )}
      </div>

      {/* Tier badges */}
      <div className="hidden md:flex md:col-span-3 flex-col items-end gap-1.5 pt-1">
        {feature.tiers.map((t) => (
          <TierBadge key={t} tier={t} />
        ))}
      </div>

      {/* Mobile tier badges - inline at the bottom */}
      <div className="col-span-12 md:hidden flex gap-1.5">
        {feature.tiers.map((t) => (
          <TierBadge key={t} tier={t} />
        ))}
      </div>
    </motion.li>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const pro = tier === "Pro";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.18em] font-medium tabular-nums ${
        pro
          ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
          : "border-white/15 text-white/55"
      }`}
    >
      {tier}
    </span>
  );
}

// ─── Closing ─────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="px-6 md:px-10 py-28 md:py-36">
      <div className="max-w-[1200px] mx-auto">
        <SectionMark n="✶" label="End of index" />
        <h2
          className="mt-10 text-[40px] sm:text-[56px] md:text-[72px] leading-[0.96] font-medium tracking-[-0.025em] max-w-3xl"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          That&apos;s the read.{" "}
          <span className="italic text-teal-300">Open the journal.</span>
        </h2>
        <div className="mt-12 flex items-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[13px] font-medium"
          >
            Sign in
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition text-[12.5px]"
          >
            See pricing
          </Link>
          <span className="text-[11.5px] uppercase tracking-[0.18em] text-white/35 ml-1">
            Free forever to start
          </span>
        </div>
      </div>
    </section>
  );
}
