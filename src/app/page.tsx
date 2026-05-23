"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageLoading from "./PageLoading";

// Brand mark — same SVG as the navbar logo, inlined so the landing has no
// extra component dependencies.
const CuequillLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 192 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    aria-label="Cuequill"
  >
    <path
      d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
      fill="#FAFAFA"
    />
    <path
      d="M31 47V75"
      stroke="#0F172A"
      strokeWidth="1.32"
      strokeLinecap="round"
    />
    <path
      d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
      fill="#0F172A"
    />
    <path
      d="M55.368 63.288C54.264 63.288 53.272 63.032 52.392 62.52C51.528 62.008 50.848 61.288 50.352 60.36C49.856 59.416 49.608 58.312 49.608 57.048C49.608 55.784 49.856 54.688 50.352 53.76C50.864 52.832 51.552 52.112 52.416 51.6C53.28 51.072 54.264 50.808 55.368 50.808C56.888 50.808 58.112 51.192 59.04 51.96C59.984 52.712 60.584 53.752 60.84 55.08H58.176C58.016 54.504 57.688 54.048 57.192 53.712C56.712 53.376 56.096 53.208 55.344 53.208C54.8 53.208 54.28 53.352 53.784 53.64C53.304 53.928 52.912 54.36 52.608 54.936C52.32 55.496 52.176 56.2 52.176 57.048C52.176 57.88 52.32 58.584 52.608 59.16C52.912 59.736 53.304 60.176 53.784 60.48C54.28 60.768 54.8 60.912 55.344 60.912C56.112 60.912 56.728 60.744 57.192 60.408C57.656 60.072 57.984 59.608 58.176 59.016H60.84C60.52 60.328 59.896 61.368 58.968 62.136C58.04 62.904 56.84 63.288 55.368 63.288ZM68.5346 63.288C67.0946 63.288 65.9986 62.848 65.2466 61.968C64.5106 61.072 64.1426 59.776 64.1426 58.08V51.096H66.6866V57.768C66.6866 58.744 66.8946 59.512 67.3106 60.072C67.7426 60.616 68.3986 60.888 69.2786 60.888C70.1586 60.888 70.8946 60.592 71.4866 60C72.0786 59.408 72.3746 58.552 72.3746 57.432V51.096H74.9186V63H72.7106L72.4946 61.224H72.3746C72.0546 61.8 71.5586 62.288 70.8866 62.688C70.2146 63.088 69.4306 63.288 68.5346 63.288ZM84.1252 63.288C82.9732 63.288 81.9572 63.032 81.0772 62.52C80.1972 61.992 79.5092 61.264 79.0132 60.336C78.5172 59.408 78.2692 58.328 78.2692 57.096C78.2692 55.848 78.5092 54.752 78.9892 53.808C79.4852 52.864 80.1732 52.128 81.0532 51.6C81.9492 51.072 82.9812 50.808 84.1492 50.808C85.3012 50.808 86.2932 51.072 87.1252 51.6C87.9572 52.112 88.5972 52.8 89.0452 53.664C89.5092 54.528 89.7412 55.48 89.7412 56.52C89.7412 56.68 89.7412 56.856 89.7412 57.048C89.7412 57.224 89.7332 57.424 89.7172 57.648H80.7652C80.8452 58.752 81.2052 59.592 81.8452 60.168C82.4852 60.728 83.2372 61.008 84.1012 61.008C84.8532 61.008 85.4452 60.856 85.8772 60.552C86.3252 60.232 86.6532 59.8 86.8612 59.256H89.4292C89.1412 60.392 88.5412 61.352 87.6292 62.136C86.7172 62.904 85.5492 63.288 84.1252 63.288ZM84.1252 53.016C83.3412 53.016 82.6452 53.256 82.0372 53.736C81.4292 54.2 81.0372 54.856 80.8612 55.704H87.1972C87.1332 54.904 86.8212 54.256 86.2612 53.76C85.7012 53.264 84.9892 53.016 84.1252 53.016ZM101.54 68.28V61.464C101.236 61.96 100.804 62.392 100.244 62.76C99.6839 63.112 98.9399 63.288 98.0119 63.288C97.0359 63.288 96.1399 63.056 95.3239 62.592C94.5239 62.112 93.8839 61.408 93.4039 60.48C92.9399 59.552 92.7079 58.408 92.7079 57.048C92.7079 55.672 92.9399 54.528 93.4039 53.616C93.8839 52.688 94.5159 51.992 95.2999 51.528C96.0839 51.048 96.9319 50.808 97.8439 50.808C98.7879 50.808 99.5559 50.992 100.148 51.36C100.74 51.712 101.204 52.192 101.54 52.8H101.684L101.9 51.096H104.084V68.28H101.54ZM98.4679 60.864C99.3799 60.864 100.132 60.544 100.724 59.904C101.332 59.264 101.636 58.312 101.636 57.048C101.636 55.768 101.332 54.816 100.724 54.192C100.132 53.552 99.3799 53.232 98.4679 53.232C97.5559 53.232 96.7959 53.544 96.1879 54.168C95.5959 54.792 95.2999 55.744 95.2999 57.024C95.2999 58.304 95.5959 59.264 96.1879 59.904C96.7959 60.544 97.5559 60.864 98.4679 60.864ZM111.706 63.288C110.266 63.288 109.17 62.848 108.418 61.968C107.682 61.072 107.314 59.776 107.314 58.08V51.096H109.858V57.768C109.858 58.744 110.066 59.512 110.482 60.072C110.914 60.616 111.57 60.888 112.45 60.888C113.33 60.888 114.066 60.592 114.658 60C115.25 59.408 115.546 58.552 115.546 57.432V51.096H118.09V63H115.882L115.666 61.224H115.546C115.226 61.8 114.73 62.288 114.058 62.688C113.386 63.088 112.602 63.288 111.706 63.288ZM126.913 49.272C126.353 49.272 125.881 49.096 125.497 48.744C125.129 48.376 124.945 47.928 124.945 47.4C124.945 46.872 125.129 46.432 125.497 46.08C125.881 45.728 126.353 45.552 126.913 45.552C127.489 45.552 127.961 45.728 128.329 46.08C128.713 46.432 128.905 46.872 128.905 47.4C128.905 47.928 128.713 48.376 128.329 48.744C127.961 49.096 127.489 49.272 126.913 49.272ZM122.137 63V60.792H125.881V54.096C125.881 53.568 125.625 53.304 125.113 53.304H122.473V51.096H125.569C126.561 51.096 127.281 51.328 127.729 51.792C128.193 52.24 128.425 52.96 128.425 53.952V60.792H132.169V63H122.137ZM135.976 63V60.792H139.96V48.72C139.96 48.192 139.704 47.928 139.192 47.928H136.312V45.72H139.648C140.576 45.72 141.28 45.968 141.76 46.464C142.256 46.944 142.504 47.648 142.504 48.576V60.792H146.512V63H135.976ZM150.366 63V60.792H154.35V48.72C154.35 48.192 154.094 47.928 153.582 47.928H150.702V45.72H154.038C154.966 45.72 155.67 45.968 156.15 46.464C156.646 46.944 156.894 47.648 156.894 48.576V60.792H160.902V63H150.366Z"
      fill="#FAFAFA"
    />
  </svg>
);

// ---------- Small presentational helpers ----------

const Feature = ({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) => (
  <div className="text-left">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
        <i className={`fa-solid ${icon} text-sm`} />
      </div>
      <div className="text-base font-semibold">{title}</div>
    </div>
    <div className="text-sm text-white/55 leading-relaxed">{body}</div>
  </div>
);

const Step = ({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) => (
  <div className="flex gap-4">
    <div className="shrink-0 w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-sm text-white/70">
      {index}
    </div>
    <div className="text-left">
      <div className="text-base font-semibold mb-1">{title}</div>
      <div className="text-sm text-white/55 leading-relaxed">{body}</div>
    </div>
  </div>
);

// A mini "demo" preview of a trade row + day tile so the page has visual texture.
const HeroPreview = () => (
  <div className="mt-12 mx-auto max-w-xl w-full border border-white/10 rounded-xl bg-[#0F0F17] p-4 md:p-6 shadow-2xl">
    <div className="grid grid-cols-2 gap-3">
      {/* Trade summary tile */}
      <div className="border border-[#282828] rounded-lg p-3 flex flex-col gap-1">
        <div className="text-[10px] text-white/40 uppercase tracking-wide">
          Net P&L
        </div>
        <div className="text-2xl text-green-500 font-semibold truncate">
          +$842.17
        </div>
      </div>
      <div className="border border-[#282828] rounded-lg p-3 flex flex-col gap-1">
        <div className="text-[10px] text-white/40 uppercase tracking-wide">
          Win rate
        </div>
        <div className="text-2xl truncate">63%</div>
      </div>
      {/* Calendar mini */}
      <div className="col-span-2 grid grid-cols-5 gap-1.5 mt-2">
        {[
          { d: 19, pl: "+42", win: true },
          { d: 20, pl: null, win: null },
          { d: 21, pl: "−18", win: false },
          { d: 22, pl: "+95", win: true },
          { d: 23, pl: "+12", win: true },
        ].map((c, i) => (
          <div
            key={i}
            className={`rounded-md py-2 text-center text-xs ${
              c.win === null
                ? "bg-white/5"
                : c.win
                  ? "bg-green-500/15"
                  : "bg-red-500/15"
            }`}
          >
            <div className="text-white/60">{c.d}</div>
            {c.pl && (
              <div
                className={`font-semibold ${
                  c.win ? "text-green-500" : "text-red-500"
                }`}
              >
                {c.pl}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// FAQ accordion — animated open/close via Framer Motion (height + opacity).
const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full py-4 flex items-center justify-between text-left cursor-pointer hover:text-white/90 transition"
      >
        <span className="text-sm md:text-base font-medium">{q}</span>
        <i
          className={`fa-solid fa-chevron-down text-xs text-white/40 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-white/55 leading-relaxed">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------- Page ----------

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return <PageLoading />;
  }
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar — same pill style as the signed-in navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex justify-between items-center w-full max-w-[1500px] mt-6 mx-6 md:mx-10 p-4 px-5 bg-white/3 backdrop-blur-xs rounded-full border border-white/10">
          <CuequillLogo className="h-7 md:h-8 w-auto" />
          <Link
            href="/login"
            className="text-sm px-4 py-1.5 rounded-full border border-white/15 hover:bg-white/5 transition"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Hero + Why Cuequill share one aurora background */}
      <main className="flex-1">
        <div className="relative overflow-hidden">
          {/* Moving aurora background — covers hero and Why Cuequill */}
          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden pointer-events-none -z-10"
          >
            <div className="aurora-orb aurora-orb-1" />
            <div className="aurora-orb aurora-orb-2" />
            <div className="aurora-orb aurora-orb-3" />
          </div>

        <section className="px-6 pt-32 pb-16 md:pt-44 md:pb-28 text-center">
          <div className="relative max-w-5xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full border border-white/10 text-[11px] uppercase tracking-wide text-white/50 mb-6">
            Trading journal · For US options
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-semibold leading-[1.1] mb-5 max-w-3xl mx-auto">
            The trading journal that actually helps you{" "}
            <span className="text-teal-400">find your edge</span>.
          </h1>
          <p className="text-base md:text-lg text-white/60 mb-8 max-w-xl mx-auto leading-relaxed">
            Log every trade. Replay the chart around each setup. Track what's
            working and what isn't — without spreadsheets or guesswork.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-md bg-teal-500 hover:bg-teal-600 transition font-medium"
            >
              Sign in to get started
            </Link>
            <a
              href="#features"
              className="px-5 py-2.5 rounded-md border border-white/15 hover:bg-white/5 transition text-sm"
            >
              See what's inside
            </a>
          </div>
          <HeroPreview />
          </div>
        </section>

        {/* Why Cuequill — value-prop deep dive */}
        <section className="relative px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div>
              <div className="text-xs uppercase tracking-wider text-teal-400 mb-3">
                Why Cuequill
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 leading-tight">
                Most journals stop at logging. Cuequill is built for the part
                that actually makes you better — review.
              </h2>
            </div>
            <div className="text-sm md:text-base text-white/65 leading-relaxed space-y-4">
              <p>
                Pull up any logged trade and you're looking at the chart around
                your entry and exit — with bar replay, so you can watch the
                setup unfold the way it really did, not the way you remember
                it.
              </p>
              <p>
                The stats page tells you what's actually happening, not what
                you wish was happening. Profit factor, expectancy, average
                R:R, longest streak — all updated automatically from the
                trades you log.
              </p>
            </div>
          </div>
        </section>
        </div>

        {/* Features grid */}
        <section id="features" className="px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-xs uppercase tracking-wider text-teal-400 mb-3 text-center">
              Inside the app
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-12 text-center">
              Everything you need. Nothing you don't.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              <Feature
                icon="fa-chart-line"
                title="Per-trade chart replay"
                body="Open any logged trade on a candlestick chart with your entry and exit highlighted. Step through bar-by-bar to study the setup."
              />
              <Feature
                icon="fa-calendar-days"
                title="P&L calendar"
                body="Daily P&L heatmap with green/red tints per day. Click any month to see win rate, profit factor, and the full breakdown."
              />
              <Feature
                icon="fa-arrows-rotate"
                title="Auto-sync from IBKR"
                body="Connect your Interactive Brokers Flex query and Cuequill imports closed trades on a schedule. Zero manual entry."
              />
              <Feature
                icon="fa-square-poll-vertical"
                title="Stats that matter"
                body="Net P&L, profit factor, win rate, average R:R, longest streak — the metrics that tell you whether your edge is real."
              />
              <Feature
                icon="fa-tags"
                title="Strategy & rule tracking"
                body="Tag every trade with the strategy you used and notes you made. Filter your stats by strategy to see which ones work."
              />
              <Feature
                icon="fa-building-columns"
                title="FOMC overlay"
                body="The calendar marks every Fed meeting day so you can see at a glance whether your worst trades were on macro-noise days."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16 md:py-24 bg-[#16151C]">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs uppercase tracking-wider text-teal-400 mb-3 text-center">
              How it works
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-12 text-center">
              Three steps. No setup ceremony.
            </h2>
            <div className="space-y-8">
              <Step
                index={1}
                title="Connect or log"
                body="Hook up Interactive Brokers in two clicks, or log trades by hand. Either way, your data lives in one place."
              />
              <Step
                index={2}
                title="Review the chart"
                body="Click any trade to see the chart around it. Use replay mode to watch the setup unfold candle by candle."
              />
              <Step
                index={3}
                title="Track your edge"
                body="The stats page updates automatically. Filter by strategy, status, or time period to find the patterns that actually make money."
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-wider text-teal-400 mb-3 text-center">
              FAQ
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-10 text-center">
              Common questions
            </h2>
            <div className="space-y-0">
              <FAQItem
                q="Who is Cuequill for?"
                a="Discretionary US options traders who want to systematically review their trades and find their edge. If you're trading SPY, AAPL, NVDA, TSLA or similar high-volume names and want to know what's actually working, this is for you."
              />
              <FAQItem
                q="What broker data does it support?"
                a="Interactive Brokers is supported natively via Flex Queries — trades sync automatically. You can also log any trade manually if you trade through a different broker."
              />
              <FAQItem
                q="Where does the chart data come from?"
                a="Historical candles come from Yahoo Finance (free, 59-day intraday window). Upgrade paths to Polygon or IBKR market data are on the roadmap."
              />
              <FAQItem
                q="Where is my data stored?"
                a="Your trade data lives in a private MongoDB database. Only you can access your account; trades are scoped per user."
              />
              <FAQItem
                q="Is it free?"
                a="Currently in private use. Reach out if you want access."
              />
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-6 py-20 md:py-28 bg-[#16151C] text-center">
          <h2 className="text-2xl md:text-4xl font-semibold mb-5 max-w-2xl mx-auto leading-tight">
            Stop journaling like it's homework. Start reviewing like it
            matters.
          </h2>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-md bg-teal-500 hover:bg-teal-600 transition font-medium"
          >
            Sign in to Cuequill
          </Link>
        </section>
      </main>

      {/* Footer with required TradingView attribution */}
      <footer className="px-6 md:px-10 py-8 text-xs text-white/45">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <CuequillLogo className="h-4 w-auto opacity-60" />
            <span>© {new Date().getFullYear()} Cuequill</span>
          </div>
          <div>
            Charts by{" "}
            <a
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline-offset-4 hover:underline"
            >
              TradingView
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
