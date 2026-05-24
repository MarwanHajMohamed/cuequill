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
    width="135"
    height="34"
    viewBox="0 0 135 34"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M7 0C11.0952 8.6 15.5317 23.2063 13.4841 24.1619C11.4365 25.1174 7 32.7619 7 32.7619C7 32.7619 2.5635 25.4587 0.515876 24.1619C-1.53175 22.8651 2.90476 8.6 7 0Z"
      fill="white"
    />
    <path
      d="M7 13.5143V32.6254"
      stroke="#0F172A"
      stroke-width="1.32"
      stroke-linecap="round"
    />
    <path
      d="M6.99976 16.8445C7.42202 16.8445 7.76424 17.187 7.7644 17.6092C7.7644 18.0316 7.42212 18.3738 6.99976 18.3738C6.57753 18.3737 6.23511 18.0315 6.23511 17.6092C6.23527 17.1871 6.57763 16.8447 6.99976 16.8445Z"
      fill="#FAFAFA"
      stroke="#0F172A"
      stroke-width="0.6"
    />
    <path
      d="M26.368 26.288C25.264 26.288 24.272 26.032 23.392 25.52C22.528 25.008 21.848 24.288 21.352 23.36C20.856 22.416 20.608 21.312 20.608 20.048C20.608 18.784 20.856 17.688 21.352 16.76C21.864 15.832 22.552 15.112 23.416 14.6C24.28 14.072 25.264 13.808 26.368 13.808C27.888 13.808 29.112 14.192 30.04 14.96C30.984 15.712 31.584 16.752 31.84 18.08H29.176C29.016 17.504 28.688 17.048 28.192 16.712C27.712 16.376 27.096 16.208 26.344 16.208C25.8 16.208 25.28 16.352 24.784 16.64C24.304 16.928 23.912 17.36 23.608 17.936C23.32 18.496 23.176 19.2 23.176 20.048C23.176 20.88 23.32 21.584 23.608 22.16C23.912 22.736 24.304 23.176 24.784 23.48C25.28 23.768 25.8 23.912 26.344 23.912C27.112 23.912 27.728 23.744 28.192 23.408C28.656 23.072 28.984 22.608 29.176 22.016H31.84C31.52 23.328 30.896 24.368 29.968 25.136C29.04 25.904 27.84 26.288 26.368 26.288ZM39.5346 26.288C38.0946 26.288 36.9986 25.848 36.2466 24.968C35.5106 24.072 35.1426 22.776 35.1426 21.08V14.096H37.6866V20.768C37.6866 21.744 37.8946 22.512 38.3106 23.072C38.7426 23.616 39.3986 23.888 40.2786 23.888C41.1586 23.888 41.8946 23.592 42.4866 23C43.0786 22.408 43.3746 21.552 43.3746 20.432V14.096H45.9186V26H43.7106L43.4946 24.224H43.3746C43.0546 24.8 42.5586 25.288 41.8866 25.688C41.2146 26.088 40.4306 26.288 39.5346 26.288ZM55.1253 26.288C53.9733 26.288 52.9573 26.032 52.0773 25.52C51.1973 24.992 50.5093 24.264 50.0133 23.336C49.5173 22.408 49.2693 21.328 49.2693 20.096C49.2693 18.848 49.5093 17.752 49.9893 16.808C50.4853 15.864 51.1733 15.128 52.0533 14.6C52.9493 14.072 53.9813 13.808 55.1493 13.808C56.3013 13.808 57.2933 14.072 58.1253 14.6C58.9573 15.112 59.5973 15.8 60.0453 16.664C60.5093 17.528 60.7413 18.48 60.7413 19.52C60.7413 19.68 60.7413 19.856 60.7413 20.048C60.7413 20.224 60.7333 20.424 60.7173 20.648H51.7653C51.8453 21.752 52.2053 22.592 52.8453 23.168C53.4853 23.728 54.2373 24.008 55.1013 24.008C55.8533 24.008 56.4453 23.856 56.8773 23.552C57.3253 23.232 57.6533 22.8 57.8613 22.256H60.4293C60.1413 23.392 59.5413 24.352 58.6293 25.136C57.7173 25.904 56.5493 26.288 55.1253 26.288ZM55.1253 16.016C54.3413 16.016 53.6453 16.256 53.0373 16.736C52.4293 17.2 52.0373 17.856 51.8613 18.704H58.1973C58.1333 17.904 57.8213 17.256 57.2613 16.76C56.7013 16.264 55.9893 16.016 55.1253 16.016ZM72.5399 31.28V24.464C72.2359 24.96 71.8039 25.392 71.2439 25.76C70.6839 26.112 69.9399 26.288 69.0119 26.288C68.0359 26.288 67.1399 26.056 66.3239 25.592C65.5239 25.112 64.8839 24.408 64.4039 23.48C63.9399 22.552 63.7079 21.408 63.7079 20.048C63.7079 18.672 63.9399 17.528 64.4039 16.616C64.8839 15.688 65.5159 14.992 66.2999 14.528C67.0839 14.048 67.9319 13.808 68.8439 13.808C69.7879 13.808 70.5559 13.992 71.1479 14.36C71.7399 14.712 72.2039 15.192 72.5399 15.8H72.6839L72.8999 14.096H75.0839V31.28H72.5399ZM69.4679 23.864C70.3799 23.864 71.1319 23.544 71.7239 22.904C72.3319 22.264 72.6359 21.312 72.6359 20.048C72.6359 18.768 72.3319 17.816 71.7239 17.192C71.1319 16.552 70.3799 16.232 69.4679 16.232C68.5559 16.232 67.7959 16.544 67.1879 17.168C66.5959 17.792 66.2999 18.744 66.2999 20.024C66.2999 21.304 66.5959 22.264 67.1879 22.904C67.7959 23.544 68.5559 23.864 69.4679 23.864ZM82.7065 26.288C81.2665 26.288 80.1705 25.848 79.4185 24.968C78.6825 24.072 78.3145 22.776 78.3145 21.08V14.096H80.8585V20.768C80.8585 21.744 81.0665 22.512 81.4825 23.072C81.9145 23.616 82.5705 23.888 83.4505 23.888C84.3305 23.888 85.0665 23.592 85.6585 23C86.2505 22.408 86.5465 21.552 86.5465 20.432V14.096H89.0905V26H86.8825L86.6665 24.224H86.5465C86.2265 24.8 85.7305 25.288 85.0585 25.688C84.3865 26.088 83.6025 26.288 82.7065 26.288ZM97.9131 12.272C97.3531 12.272 96.8811 12.096 96.4971 11.744C96.1291 11.376 95.9451 10.928 95.9451 10.4C95.9451 9.872 96.1291 9.432 96.4971 9.08C96.8811 8.728 97.3531 8.552 97.9131 8.552C98.4891 8.552 98.9611 8.728 99.3291 9.08C99.7131 9.432 99.9051 9.872 99.9051 10.4C99.9051 10.928 99.7131 11.376 99.3291 11.744C98.9611 12.096 98.4891 12.272 97.9131 12.272ZM93.1371 26V23.792H96.8811V17.096C96.8811 16.568 96.6251 16.304 96.1131 16.304H93.4731V14.096H96.5691C97.5611 14.096 98.2811 14.328 98.7291 14.792C99.1931 15.24 99.4251 15.96 99.4251 16.952V23.792H103.169V26H93.1371ZM106.976 26V23.792H110.96V11.72C110.96 11.192 110.704 10.928 110.192 10.928H107.312V8.72H110.648C111.576 8.72 112.28 8.968 112.76 9.464C113.256 9.944 113.504 10.648 113.504 11.576V23.792H117.512V26H106.976ZM121.366 26V23.792H125.35V11.72C125.35 11.192 125.094 10.928 124.582 10.928H121.702V8.72H125.038C125.966 8.72 126.67 8.968 127.15 9.464C127.646 9.944 127.894 10.648 127.894 11.576V23.792H131.902V26H121.366Z"
      fill="white"
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
          <CuequillLogo className="pl-2 h-7 w-auto" />
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
                Log every trade. Replay the chart around each setup. Track
                what&apos;s working and what isn&apos;t — without spreadsheets or
                guesswork.
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
                  See what&apos;s inside
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
                  Pull up any logged trade and you&apos;re looking at the chart
                  around your entry and exit — with bar replay, so you can watch
                  the setup unfold the way it really did, not the way you
                  remember it.
                </p>
                <p>
                  The stats page tells you what&apos;s actually happening, not what
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
              Everything you need. Nothing you don&apos;t.
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
            Stop journaling like it&apos;s homework. Start reviewing like it matters.
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
