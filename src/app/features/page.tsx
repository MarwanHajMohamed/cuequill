"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  SectionMark,
  SiteFooter,
  SiteHeader,
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

// Features that have a dedicated video showcase at the top of the page.
// Their titles are filtered out of the catalogue lists below so the same
// item doesn't appear in two places.
type VideoFeature = {
  n: string;
  label: string;
  title: React.ReactNode;
  body: string;
  detail: string;
  tiers: Tier[];
  // Match key into the GROUPS data below - the rendered list filters
  // these out so a feature doesn't appear in both surfaces.
  excludesTitle: string;
  // Path to the video that will eventually live here. Until you drop
  // the file in, the player renders a tasteful placeholder.
  videoSrc?: string;
  // Optional poster image while the video buffers.
  posterSrc?: string;
};

const VIDEO_FEATURES: VideoFeature[] = [
  {
    n: "01",
    label: "Calendar",
    title: (
      <>
        A calendar tinted by{" "}
        <span className="italic text-teal-300">your daily P/L.</span>
      </>
    ),
    body: "Each weekday is colored by your net P/L for that day. Click a day to see the trades behind the number.",
    detail: "Mon–Fri grid · Click any day",
    tiers: ["Free", "Pro"],
    excludesTitle: "P/L calendar",
  },
  {
    n: "02",
    label: "Quill AI",
    title: (
      <>
        Ask your trades anything,{" "}
        <span className="italic text-teal-300">in plain English.</span>
      </>
    ),
    body: "Ask questions about your own trades and get answers based on your own data. Useful for reviewing recent losses, comparing strategies, or checking patterns.",
    detail: "Pro only",
    tiers: ["Pro"],
    excludesTitle: "Ask anything",
  },
  {
    n: "03",
    label: "Logging",
    title: (
      <>
        Add a trade in{" "}
        <span className="italic text-teal-300">a single sweep.</span>
      </>
    ),
    body: "Symbol, direction, contract, qty, strike, and dates. The closing fields appear once you mark a trade as a win or loss.",
    detail: "⌘+Enter to save",
    tiers: ["Free", "Pro"],
    excludesTitle: "Manual entry",
  },
];

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
    lede: "Log trades by hand or sync them from your broker. Both end up in the same journal, with duplicates filtered out.",
    items: [
      {
        title: "Plain-English logging",
        body: "Send Quill AI a sentence like \"log 3 SPY 600 calls at $1.20 expiring Friday\" and it creates the trade for you.",
        detail: "Via Quill AI",
        tiers: ["Pro"],
      },
      {
        title: "IBKR Flex auto-sync",
        body: "Paste a Flex token in settings and your IBKR fills import each weeknight after close. Duplicates are filtered automatically.",
        detail: "Nightly · ~3 min setup",
        tiers: ["Pro"],
      },
      {
        title: "Tags",
        body: "Attach reusable tags to trades — your own mistakes, your own setups. Tags feed the per-tag stats and the mistake leaderboard.",
        detail: "Per trade · multi-select",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Trade notes",
        body: "Free-text notes on any trade.",
        detail: "Per trade",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Simulated mode",
        body: "Mark a trade or your whole account as simulated. Simulated trades are excluded from stats unless you opt in.",
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
    lede: "A calendar, a per-day breakdown, and a stats page you can filter.",
    items: [
      {
        title: "Day modal",
        body: "Open any day in the calendar to see net P/L and every trade you took on that day. Trades open for editing from the same view.",
        detail: "Click any day",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Statistics page",
        body: "Win rate, expectancy, profit factor, R:R, streaks. Pro adds per-symbol and per-strategy breakdowns plus an equity curve.",
        detail: "Core free · per-strategy & per-symbol on Pro",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Trades table",
        body: "Reorder and hide columns. Filters live in the URL so you can share a view or come back to it later.",
        detail: "Customisable columns",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Dashboard insights",
        body: "Three tiles below the calendar: daily risk used, strategy ranking, and the tags costing you the most.",
        detail: "Lives on the dashboard",
        tiers: ["Pro"],
      },
      {
        title: "Equity curve",
        body: "Cumulative net P/L over time, with a hover summary.",
        detail: "All-time",
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
    lede: "Plain-English questions about your own trades. Quill AI reads your journal and answers from it.",
    items: [
      {
        title: "Reads imported fills",
        body: "IBKR-imported fills and your manual entries are treated the same. Quill reads both.",
        detail: "Pro only",
        tiers: ["Pro"],
      },
      {
        title: "Performance analysis",
        body: "Group your trades by strategy, symbol, day of the week, or time of day.",
        detail: "Pro only",
        tiers: ["Pro"],
      },
      {
        title: "Pattern & mistake spotting",
        body: "Quill cross-references your tags, times, symbols, and strategies to surface what your losing trades have in common.",
        detail: "Pro only",
        tiers: ["Pro"],
      },
      {
        title: "Rule-adherence checks",
        body: "Ask whether a set of trades followed your rules. Quill compares them against your rules board.",
        detail: "Reads your rules",
        tiers: ["Pro"],
      },
      {
        title: "Threads & history",
        body: "Conversations are saved so you can come back and ask a follow-up.",
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
    lede: "A strategy playbook, a rules board, and a goals page so the structure of how you trade lives somewhere.",
    items: [
      {
        title: "Strategy playbook",
        body: "Eleven discretionary US-options setups with schematics and entry rules. Tag your trades against them to get per-strategy stats.",
        detail: "11 setups · CALL & PUT",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Rules board",
        body: "Write your own rules, grouped into sections. Quill AI reads them when you ask about rule-adherence.",
        detail: "Inline editor",
        tiers: ["Pro"],
      },
      {
        title: "Affirmations",
        body: "A short daily checklist you can run through before the open.",
        detail: "Daily",
        tiers: ["Pro"],
      },
      {
        title: "Goals",
        body: "Set monthly and daily P/L targets. Progress is shown on the dashboard.",
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
    lede: "Works on phone and desktop. Dark by default, with a light mode that flips the whole app.",
    items: [
      {
        title: "Light & dark themes",
        body: "Switch between dark and light. The choice is remembered across sessions.",
        detail: "One-click switch",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Installable PWA",
        body: "Add to your home screen on iOS or Android. The mobile build uses a floating tab bar and swipe gestures.",
        detail: "iOS · Android",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Keyboard shortcuts",
        body: "⌘+Enter to save inside any modal, Esc to close.",
        detail: "Modal-aware",
        tiers: ["Free", "Pro"],
      },
      {
        title: "Private by default",
        body: "Your trades are scoped to your account. The IBKR token is encrypted at rest. Quill AI only sees your own trades.",
        detail: "Encrypted at rest",
        tiers: ["Free", "Pro"],
      },
    ],
  },
];

// ─── Page ────────────────────────────────────────────────────────────

export default function FeaturesPage() {
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
        <FeaturesHero />

        <ShowcaseSection />

        {GROUPS.map((g) => {
          // Filter out any item that already has a dedicated video slot
          // above, then skip the whole group if nothing's left.
          const items = g.items.filter(
            (it) => !VIDEO_FEATURES.some((v) => v.excludesTitle === it.title),
          );
          if (items.length === 0) return null;
          return (
            <FeatureGroupSection key={g.n} group={{ ...g, items }} />
          );
        })}

        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function FeaturesHero() {
  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1200px] mx-auto py-20 md:py-28 flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.2em] text-white/55">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Features
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-[40px] sm:text-[60px] md:text-[76px] leading-[0.98] font-medium tracking-[-0.025em] max-w-4xl"
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
          Everything Cuequill does, grouped and labelled by plan — what&apos;s
          free, what&apos;s Pro, and what you can ask Quill AI to do in plain
          English.
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

// ─── Video showcase ──────────────────────────────────────────────────
// Three large slots for the marquee features (Calendar, Quill AI,
// Adding a trade). Each row alternates the video side so the page
// reads as a sequence of spreads rather than a stack.

function ShowcaseSection() {
  return (
    <section className="px-6 md:px-10 pb-8 md:pb-12">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-16 md:gap-28">
        {VIDEO_FEATURES.map((v, i) => (
          <VideoFeatureBlock key={v.n} feature={v} reverse={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function VideoFeatureBlock({
  feature,
  reverse,
}: {
  feature: VideoFeature;
  reverse: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="grid md:grid-cols-12 gap-8 md:gap-12 items-center"
    >
      {/* Text column - sticky-feeling, sits next to the video.
          Reverse flips it to the other side on alternating blocks. */}
      <div
        className={`md:col-span-5 ${reverse ? "md:order-2" : "md:order-1"}`}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-teal-300 font-display italic text-[18px] md:text-[20px] tabular-nums">
            {feature.n}
          </span>
          <span className="h-px flex-1 bg-[var(--rule)] max-w-[80px] translate-y-[-2px]" />
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-white/45">
            {feature.label}
          </span>
        </div>
        <h2 className="mt-6 text-[28px] md:text-[40px] leading-[1.04] font-medium tracking-[-0.02em]">
          {feature.title}
        </h2>
        <p className="mt-5 max-w-md text-[13.5px] text-white/60 leading-relaxed">
          {feature.body}
        </p>
        <p className="mt-5 text-[10.5px] uppercase tracking-[0.18em] text-white/35 tabular-nums">
          {feature.detail}
        </p>
        <div className="mt-5 flex items-center gap-1.5">
          {feature.tiers.map((t) => (
            <TierBadge key={t} tier={t} />
          ))}
        </div>
      </div>

      {/* Video column - placeholder card now, real <video> later */}
      <div
        className={`md:col-span-7 ${reverse ? "md:order-1" : "md:order-2"}`}
      >
        <VideoSlot
          src={feature.videoSrc}
          poster={feature.posterSrc}
          label={feature.label}
        />
      </div>
    </motion.article>
  );
}

// Renders either a real <video> if `src` is set, or a tasteful 16:9
// placeholder so the layout reads correctly while the videos are still
// being recorded.
function VideoSlot({
  src,
  poster,
  label,
}: {
  src?: string;
  poster?: string;
  label: string;
}) {
  return (
    <figure className="relative">
      <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_var(--shadow-soft)]">
        {src ? (
          <video
            src={src}
            poster={poster}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          // Placeholder: faint grid + center play-affordance + corner
          // label so the slot reads as "video lives here" while you
          // record the real footage.
          <>
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 50%, rgba(20,184,166,0.10), transparent 70%)",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/55">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md text-teal-300">
                <i className="fa-solid fa-play text-[16px] ml-[2px]" />
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.22em] text-white/40">
                {label} · video coming soon
              </span>
            </div>
          </>
        )}
      </div>
    </figure>
  );
}

// ─── Group section ──────────────────────────────────────────────────

function FeatureGroupSection({ group }: { group: FeatureGroup }) {
  return (
    <section className="px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-10 md:gap-12 items-start">
        {/* Group head (sticky) */}
        <div className="md:col-span-4 md:sticky md:top-28 self-start">
          <SectionMark label={group.label} />
          <h2 className="mt-6 text-[30px] md:text-[38px] leading-[1.06] font-medium tracking-[-0.02em]">
            {group.heading}
          </h2>
          <p className="mt-5 max-w-sm text-[13px] text-white/55 leading-relaxed">
            {group.lede}
          </p>
          <p className="mt-6 text-[10.5px] uppercase tracking-[0.2em] text-white/35 tabular-nums">
            {group.items.length} entries
          </p>
        </div>

        {/* Feature list */}
        <ol className="md:col-span-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_var(--shadow-soft)] divide-y divide-white/[0.07] px-5 md:px-7">
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
    <section className="px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_var(--shadow-soft)] p-8 md:p-14">
        <SectionMark label="Get started" />
        <h2 className="mt-6 text-[36px] sm:text-[48px] md:text-[60px] leading-[0.98] font-medium tracking-[-0.025em] max-w-3xl">
          That&apos;s the tour.{" "}
          <span className="italic text-teal-300">Open the journal.</span>
        </h2>
        <div className="mt-10 flex items-center gap-3 flex-wrap">
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
