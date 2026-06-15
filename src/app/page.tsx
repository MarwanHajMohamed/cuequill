"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageLoading from "./PageLoading";

// Brand wordmark - same SVG as the navbar logo.
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
      strokeWidth="1.32"
      strokeLinecap="round"
    />
    <path
      d="M6.99976 16.8445C7.42202 16.8445 7.76424 17.187 7.7644 17.6092C7.7644 18.0316 7.42212 18.3738 6.99976 18.3738C6.57753 18.3737 6.23511 18.0315 6.23511 17.6092C6.23527 17.1871 6.57763 16.8447 6.99976 16.8445Z"
      fill="#FAFAFA"
      stroke="#0F172A"
      strokeWidth="0.6"
    />
    <path
      d="M26.368 26.288C25.264 26.288 24.272 26.032 23.392 25.52C22.528 25.008 21.848 24.288 21.352 23.36C20.856 22.416 20.608 21.312 20.608 20.048C20.608 18.784 20.856 17.688 21.352 16.76C21.864 15.832 22.552 15.112 23.416 14.6C24.28 14.072 25.264 13.808 26.368 13.808C27.888 13.808 29.112 14.192 30.04 14.96C30.984 15.712 31.584 16.752 31.84 18.08H29.176C29.016 17.504 28.688 17.048 28.192 16.712C27.712 16.376 27.096 16.208 26.344 16.208C25.8 16.208 25.28 16.352 24.784 16.64C24.304 16.928 23.912 17.36 23.608 17.936C23.32 18.496 23.176 19.2 23.176 20.048C23.176 20.88 23.32 21.584 23.608 22.16C23.912 22.736 24.304 23.176 24.784 23.48C25.28 23.768 25.8 23.912 26.344 23.912C27.112 23.912 27.728 23.744 28.192 23.408C28.656 23.072 28.984 22.608 29.176 22.016H31.84C31.52 23.328 30.896 24.368 29.968 25.136C29.04 25.904 27.84 26.288 26.368 26.288ZM39.5346 26.288C38.0946 26.288 36.9986 25.848 36.2466 24.968C35.5106 24.072 35.1426 22.776 35.1426 21.08V14.096H37.6866V20.768C37.6866 21.744 37.8946 22.512 38.3106 23.072C38.7426 23.616 39.3986 23.888 40.2786 23.888C41.1586 23.888 41.8946 23.592 42.4866 23C43.0786 22.408 43.3746 21.552 43.3746 20.432V14.096H45.9186V26H43.7106L43.4946 24.224H43.3746C43.0546 24.8 42.5586 25.288 41.8866 25.688C41.2146 26.088 40.4306 26.288 39.5346 26.288ZM55.1253 26.288C53.9733 26.288 52.9573 26.032 52.0773 25.52C51.1973 24.992 50.5093 24.264 50.0133 23.336C49.5173 22.408 49.2693 21.328 49.2693 20.096C49.2693 18.848 49.5093 17.752 49.9893 16.808C50.4853 15.864 51.1733 15.128 52.0533 14.6C52.9493 14.072 53.9813 13.808 55.1493 13.808C56.3013 13.808 57.2933 14.072 58.1253 14.6C58.9573 15.112 59.5973 15.8 60.0453 16.664C60.5093 17.528 60.7413 18.48 60.7413 19.52C60.7413 19.68 60.7413 19.856 60.7413 20.048C60.7413 20.224 60.7333 20.424 60.7173 20.648H51.7653C51.8453 21.752 52.2053 22.592 52.8453 23.168C53.4853 23.728 54.2373 24.008 55.1013 24.008C55.8533 24.008 56.4453 23.856 56.8773 23.552C57.3253 23.232 57.6533 22.8 57.8613 22.256H60.4293C60.1413 23.392 59.5413 24.352 58.6293 25.136C57.7173 25.904 56.5493 26.288 55.1253 26.288ZM55.1253 16.016C54.3413 16.016 53.6453 16.256 53.0373 16.736C52.4293 17.2 52.0373 17.856 51.8613 18.704H58.1973C58.1333 17.904 57.8213 17.256 57.2613 16.76C56.7013 16.264 55.9893 16.016 55.1253 16.016ZM72.5399 31.28V24.464C72.2359 24.96 71.8039 25.392 71.2439 25.76C70.6839 26.112 69.9399 26.288 69.0119 26.288C68.0359 26.288 67.1399 26.056 66.3239 25.592C65.5239 25.112 64.8839 24.408 64.4039 23.48C63.9399 22.552 63.7079 21.408 63.7079 20.048C63.7079 18.672 63.9399 17.528 64.4039 16.616C64.8839 15.688 65.5159 14.992 66.2999 14.528C67.0839 14.048 67.9319 13.808 68.8439 13.808C69.7879 13.808 70.5559 13.992 71.1479 14.36C71.7399 14.712 72.2039 15.192 72.5399 15.8H72.6839L72.8999 14.096H75.0839V31.28H72.5399ZM69.4679 23.864C70.3799 23.864 71.1319 23.544 71.7239 22.904C72.3319 22.264 72.6359 21.312 72.6359 20.048C72.6359 18.768 72.3319 17.816 71.7239 17.192C71.1319 16.552 70.3799 16.232 69.4679 16.232C68.5559 16.232 67.7959 16.544 67.1879 17.168C66.5959 17.792 66.2999 18.744 66.2999 20.024C66.2999 21.304 66.5959 22.264 67.1879 22.904C67.7959 23.544 68.5559 23.864 69.4679 23.864ZM82.7065 26.288C81.2665 26.288 80.1705 25.848 79.4185 24.968C78.6825 24.072 78.3145 22.776 78.3145 21.08V14.096H80.8585V20.768C80.8585 21.744 81.0665 22.512 81.4825 23.072C81.9145 23.616 82.5705 23.888 83.4505 23.888C84.3305 23.888 85.0665 23.592 85.6585 23C86.2505 22.408 86.5465 21.552 86.5465 20.432V14.096H89.0905V26H86.8825L86.6665 24.224H86.5465C86.2265 24.8 85.7305 25.288 85.0585 25.688C84.3865 26.088 83.6025 26.288 82.7065 26.288ZM97.9131 12.272C97.3531 12.272 96.8811 12.096 96.4971 11.744C96.1291 11.376 95.9451 10.928 95.9451 10.4C95.9451 9.872 96.1291 9.432 96.4971 9.08C96.8811 8.728 97.3531 8.552 97.9131 8.552C98.4891 8.552 98.9611 8.728 99.3291 9.08C99.7131 9.432 99.9051 9.872 99.9051 10.4C99.9051 10.928 99.7131 11.376 99.3291 11.744C98.9611 12.096 98.4891 12.272 97.9131 12.272ZM93.1371 26V23.792H96.8811V17.096C96.8811 16.568 96.6251 16.304 96.1131 16.304H93.4731V14.096H96.5691C97.5611 14.096 98.2811 14.328 98.7291 14.792C99.1931 15.24 99.4251 15.96 99.4251 16.952V23.792H103.169V26H93.1371ZM106.976 26V23.792H110.96V11.72C110.96 11.192 110.704 10.928 110.192 10.928H107.312V8.72H110.648C111.576 8.72 112.28 8.968 112.76 9.464C113.256 9.944 113.504 10.648 113.504 11.576V23.792H117.512V26H106.976ZM121.366 26V23.792H125.35V11.72C125.35 11.192 125.094 10.928 124.582 10.928H121.702V8.72H125.038C125.966 8.72 126.67 8.968 127.15 9.464C127.646 9.944 127.894 10.648 127.894 11.576V23.792H131.902V26H121.366Z"
      fill="white"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────
// Presentational helpers

const Feature = ({
  icon,
  title,
  body,
  tint = "teal",
}: {
  icon: string;
  title: string;
  body: string;
  tint?: "teal" | "indigo" | "emerald" | "amber" | "fuchsia" | "rose";
}) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    teal: {
      bg: "bg-teal-500/10",
      text: "text-teal-300",
      border: "border-teal-500/25",
    },
    indigo: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-300",
      border: "border-indigo-500/25",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/25",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/25",
    },
    fuchsia: {
      bg: "bg-fuchsia-500/10",
      text: "text-fuchsia-300",
      border: "border-fuchsia-500/25",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      border: "border-rose-500/25",
    },
  };
  const c = colors[tint];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition p-5 md:p-6 flex flex-col gap-3 text-left">
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.bg} ${c.text} ${c.border}`}
      >
        <i className={`fa-solid ${icon} text-[14px]`} />
      </div>
      <div className="text-[15px] md:text-base font-semibold tracking-tight">
        {title}
      </div>
      <div className="text-[13px] text-white/55 leading-relaxed">{body}</div>
    </div>
  );
};

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
    <div className="shrink-0 w-9 h-9 rounded-xl border border-teal-500/25 bg-teal-500/10 flex items-center justify-center text-[13px] font-semibold text-teal-300 tabular-nums">
      {String(index).padStart(2, "0")}
    </div>
    <div className="text-left">
      <div className="text-base font-semibold mb-1 tracking-tight">{title}</div>
      <div className="text-[13.5px] text-white/55 leading-relaxed">{body}</div>
    </div>
  </div>
);

// Mini demo card: a Day modal preview + a chat snippet so the page
// shows what the actual product looks like.
const HeroPreview = () => (
  <div className="mt-12 mx-auto max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Day-trades card */}
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 shadow-[0_24px_80px_var(--shadow)]">
      <div className="bg-gradient-to-b from-green-500/15 to-transparent rounded-xl px-4 py-3 border-b border-white/10">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium">
          Mon · June 9
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-green-300">
            +$847.23
          </div>
          <div className="text-[11px] text-white/45">net P/L</div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 text-[10px] font-medium">
            <i className="fa-solid fa-arrow-trend-up text-[8px]" /> 3 wins
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/25 text-[10px] font-medium">
            <i className="fa-solid fa-arrow-trend-down text-[8px]" /> 1 loss
          </span>
        </div>
      </div>
      <div className="px-1 pt-3 space-y-2">
        {[
          { sym: "SPY", opt: "CALL", strike: 600, qty: 5, pl: "+$420.00", w: true },
          { sym: "AAPL", opt: "PUT", strike: 230, qty: 3, pl: "+$285.00", w: true },
          { sym: "NVDA", opt: "CALL", strike: 140, qty: 2, pl: "−$57.77", w: false },
        ].map((t, i) => (
          <div
            key={i}
            className="relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02]"
          >
            <span
              className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${
                t.w ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <div className="flex items-center gap-2 pl-2">
              <span className="font-semibold text-[13px]">{t.sym}</span>
              <span
                className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-full border ${
                  t.opt === "CALL"
                    ? "bg-green-500/10 text-green-300 border-green-500/25"
                    : "bg-red-500/10 text-red-300 border-red-500/25"
                }`}
              >
                {t.opt}
              </span>
              <span className="text-[11px] text-white/45 tabular-nums">
                {t.strike} ×{t.qty}
              </span>
            </div>
            <div
              className={`font-semibold tabular-nums text-[13px] ${
                t.w ? "text-green-300" : "text-red-300"
              }`}
            >
              {t.pl}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* QuillAI card */}
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 shadow-[0_24px_80px_var(--shadow)] flex flex-col">
      <div className="flex items-center gap-2 px-2 pt-1 pb-3 border-b border-white/10">
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/40 to-emerald-500/30 border border-teal-400/40 flex items-center justify-center">
          <i className="fa-solid fa-wand-magic-sparkles text-[11px] text-teal-200" />
        </span>
        <div className="text-[13px] font-semibold tracking-tight">
          QuillAI
        </div>
      </div>
      <div className="flex flex-col gap-2 px-1 py-3 text-[12.5px]">
        <div className="self-end max-w-[88%] rounded-2xl px-3 py-2 bg-teal-500/15 border border-teal-500/25 text-white">
          Log 3 SPY 600{" "}
          <span className="text-green-300 font-semibold">CALL</span> at $1.20
          today, expiring Friday.
        </div>
        <div className="self-start max-w-[92%] rounded-2xl px-3 py-2 bg-white/[0.04] border border-white/10 text-white/90 leading-relaxed">
          Saved. 3× SPY 600{" "}
          <span className="text-green-300 font-semibold">CALL</span> opened
          today at $1.20/contract, expiring 2026-06-13.
        </div>
        <div className="self-end max-w-[80%] rounded-2xl px-3 py-2 bg-teal-500/15 border border-teal-500/25 text-white">
          How am I doing on PUTs this month?
        </div>
        <div className="self-start max-w-[92%] rounded-2xl px-3 py-2 bg-white/[0.04] border border-white/10 text-white/90 leading-relaxed">
          <span className="text-red-300 font-semibold">PUT</span> trades:{" "}
          <strong className="text-white">11 closed</strong>, win rate 64%, net{" "}
          <span className="text-green-300 font-medium tabular-nums">
            +$1,248.40
          </span>
          .
        </div>
      </div>
    </div>
  </div>
);

// FAQ accordion with framer-motion height animation.
const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full py-4 flex items-center justify-between text-left cursor-pointer hover:text-white/90 transition"
      >
        <span className="text-[14px] md:text-[15px] font-medium">{q}</span>
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
            <div className="pb-4 text-[13px] md:text-[14px] text-white/55 leading-relaxed">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Aurora background shared with the signed-in app.
const Aurora = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 -z-10"
    style={{
      background:
        "radial-gradient(40% 50% at 20% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 70%), radial-gradient(40% 50% at 80% 5%, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 70%), radial-gradient(35% 40% at 50% 60%, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0) 70%)",
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────
// Page

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
      <Aurora />

      {/* Top bar - glass pill like the signed-in navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex justify-between items-center w-full max-w-[1500px] mt-6 mx-3 md:mx-10 py-2 pl-3 pr-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-[0_2px_24px_var(--shadow-soft)]">
          <div className="flex items-center gap-2 pl-2 pr-3 py-1">
            <CuequillLogo className="h-7 w-auto" />
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-32 pb-12 md:pt-44 md:pb-20">
          <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-[0.16em] text-white/55 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              For discretionary US options traders
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold leading-[1.05] mb-5 max-w-3xl tracking-tight">
              Your trades remember everything.{" "}
              <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-emerald-400 bg-clip-text text-transparent">
                You don&apos;t.
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/60 mb-8 max-w-xl leading-relaxed">
              Cuequill imports every fill from your broker, lines them up in
              one calendar you&apos;ll actually open, and lets you ask{" "}
              <span className="text-white/85 font-medium">QuillAI</span>{" "}
              questions in plain English. Find what works. Cut what
              doesn&apos;t. Stop bleeding money to mistakes you can&apos;t see.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[14px] font-medium"
              >
                Open your journal
                <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[14px] font-medium"
              >
                Take the tour
              </a>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Pitch */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400 mb-3 font-medium">
                The problem
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4 leading-tight">
                Most traders keep a journal. Almost nobody reads it.
              </h2>
            </div>
            <div className="text-[14px] md:text-[15px] text-white/65 leading-relaxed space-y-4">
              <p>
                Three months from now, you&apos;ll forget why that AAPL trade
                worked. You&apos;ll forget which week you sized up and gave
                back a month. You&apos;ll keep running the setup that flatters
                your gut even when the numbers say it&apos;s the one bleeding
                you.
              </p>
              <p>
                Cuequill remembers for you. Every fill lands in a calendar you
                can scan in two seconds. Click any day for the full breakdown.
                Ask{" "}
                <span className="text-white/85 font-medium">QuillAI</span>{" "}
                what your last five losses had in common - and get an actual
                answer, not a spreadsheet to build.
              </p>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section id="features" className="px-6 py-16 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400 mb-3 font-medium">
                What&apos;s inside
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Built around the part nobody else does. Reviewing.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Feature
                tint="teal"
                icon="fa-wand-magic-sparkles"
                title="Ask, don't dig"
                body="QuillAI has read every fill in your journal. Ask which strategy is leaking money. Ask what your last five losses had in common. Ask it to log a fresh trade in one sentence. It does the rest."
              />
              <Feature
                tint="indigo"
                icon="fa-calendar-days"
                title="Your month, in one glance"
                body="Every trading day tinted green or red by P/L. Click any day for a clean breakdown of every fill. The week's total on the right. No more guessing how you did."
              />
              <Feature
                tint="emerald"
                icon="fa-arrows-rotate"
                title="Set it once, forget it"
                body="Drop in your IBKR Flex token. Cuequill imports fills nightly - commissions and fees included. Never paste a screenshot into a spreadsheet again."
              />
              <Feature
                tint="amber"
                icon="fa-square-poll-vertical"
                title="The numbers your broker won't show you"
                body="Expectancy, profit factor, win rate, R:R, streaks. Sliced by symbol, strategy, period - or all four at once. See what's luck and what's actual edge."
              />
              <Feature
                tint="fuchsia"
                icon="fa-bezier-curve"
                title="Your setups, schematic-first"
                body="Every strategy gets its own page: schematic, entry rules, example charts. Tag your trades so you can finally see which setups deserve your size and which are draining it."
              />
              <Feature
                tint="rose"
                icon="fa-bullseye"
                title="Discipline, on rails"
                body="Daily and monthly goals you'll actually hit. A daily affirmations ritual so the discipline beat doesn't slip. A risk budget that warns you before you give back the week."
              />
              <Feature
                tint="teal"
                icon="fa-mobile-screen-button"
                title="Lives in your pocket"
                body="Install it like a real app. Floating bottom tab bar, swipe-to-change-month, offline cache. Open it on the lunch break and check today."
              />
              <Feature
                tint="indigo"
                icon="fa-sliders"
                title="Your table, your rules"
                body="Reorder columns. Hide what you don't care about. Filters slide in from the side and live in the URL - so you can share a view or come back to it."
              />
              <Feature
                tint="emerald"
                icon="fa-shield-halved"
                title="Private by default"
                body="Trades scoped to your account. IBKR token encrypted at rest. Want to test a strategy without polluting your real journal? Simulated mode is one toggle away."
              />
            </div>
          </div>
        </section>

        {/* QuillAI spotlight */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/[0.02] md:bg-white/[0.03] p-6 md:p-10 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[11px] uppercase tracking-[0.15em] mb-4 font-medium">
                <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
                New
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 leading-tight">
                Meet{" "}
                <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                  QuillAI
                </span>
                . Your journal, finally talkable to.
              </h2>
              <p className="text-[14px] md:text-[15px] text-white/65 leading-relaxed mb-4">
                <span className="text-white/85 font-medium">QuillAI</span> has
                read every fill you&apos;ve ever made. Ask it what&apos;s
                working. Ask it what your last losses had in common. Ask it to
                log a fresh trade in one sentence. It answers in seconds -
                instead of you spending an hour pivoting cells.
              </p>
              <ul className="space-y-2 text-[13.5px] text-white/70">
                {[
                  "“Log 5 SPY 600 CALL at $1.20 expiring Friday.”",
                  "“Mark my AAPL PUTs from today as a win at $1.85.”",
                  "“Compare this week's net P/L to the first week of May.”",
                  "“Which strategy has the worst expectancy?”",
                ].map((q) => (
                  <li
                    key={q}
                    className="flex gap-2 pl-3 border-l-2 border-teal-400/40"
                  >
                    <span className="italic text-white/80">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 shadow-[0_24px_80px_var(--shadow)]">
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="self-end max-w-[88%] rounded-2xl px-3 py-2 bg-teal-500/15 border border-teal-500/25 text-white">
                  Mark my AAPL{" "}
                  <span className="text-red-300 font-semibold">PUT</span> from
                  today as a win at $1.85.
                </div>
                <div className="self-start max-w-[92%] rounded-2xl px-3 py-2 bg-white/[0.04] border border-white/10 text-white/90 leading-relaxed">
                  Done. Closed 3× AAPL 230{" "}
                  <span className="text-red-300 font-semibold">PUT</span> at
                  $1.85/contract today.{" "}
                  <strong className="text-white">Net P/L</strong>:{" "}
                  <span className="text-green-300 font-semibold tabular-nums">
                    +$285.00
                  </span>
                  .
                </div>
                <div className="self-end max-w-[80%] rounded-2xl px-3 py-2 bg-teal-500/15 border border-teal-500/25 text-white">
                  Which strategy has the worst expectancy?
                </div>
                <div className="self-start max-w-[94%] rounded-2xl px-3 py-2 bg-white/[0.04] border border-white/10 text-white/90 leading-relaxed">
                  Hard Floor:{" "}
                  <strong className="text-white">10 closed</strong>, win rate
                  40%, expectancy{" "}
                  <span className="text-red-300 font-medium tabular-nums">
                    -$18.40
                  </span>
                  /trade. Want to see them?
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400 mb-3 font-medium">
                How it works
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Three steps to a journal that fights for you.
              </h2>
            </div>
            <div className="space-y-8">
              <Step
                index={1}
                title="Plug in once"
                body="Drop your IBKR Flex token into settings. Cuequill imports every fill nightly - commissions and fees included. Prefer to log by hand? Tell QuillAI in plain English and you're done."
              />
              <Step
                index={2}
                title="Open it like a habit"
                body="The calendar tints every trading day with its P/L. One click reveals every fill on that day. Filters and stats recompute live - no formulas to maintain, nothing to break."
              />
              <Step
                index={3}
                title="Talk to your trades"
                body="Open the chat. Ask anything. Get an answer in seconds - about your own data, not the internet's. Then act on it before the bell."
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400 mb-3 font-medium">
                FAQ
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Common questions
              </h2>
            </div>
            <div className="space-y-0">
              <FAQItem
                q="Who is Cuequill for?"
                a="Discretionary US options traders who want to actually review their trades instead of just logging them. If you trade SPY, AAPL, NVDA, TSLA, QQQ or similar high-volume names off setups you've built up over time, you'll feel at home."
              />
              <FAQItem
                q="I already use a spreadsheet. Why switch?"
                a="Because you stopped opening it. A spreadsheet rewards you for building formulas, not for reading what they say. Cuequill is built for the reading part - a calendar that loads in two seconds, stats that update live as you filter, and an AI that answers questions a pivot table never could."
              />
              <FAQItem
                q="What does QuillAI actually do?"
                a="QuillAI runs on Google Gemini and has direct read access to your trade history (entries, exits, P/L, strategies, dates). It can analyse and compare anything in your journal, and it can call internal tools to add or edit trades for you when you ask in plain English."
              />
              <FAQItem
                q="Does it sync from my broker?"
                a="Interactive Brokers is supported natively. Set up a Flex Web Service Query once and Cuequill imports closed trades nightly, including commissions and fees. Manual entry works too — for either side."
              />
              <FAQItem
                q="Can I install it on my phone?"
                a="Yes. Cuequill is a Progressive Web App — open it in Safari/Chrome and pick 'Add to Home Screen'. You'll get a full-screen app with a floating bottom tab bar, swipe-to-change-month gestures, and offline caching."
              />
              <FAQItem
                q="Where does my data live?"
                a="Your trade data is stored in a private MongoDB instance, scoped per user. Your IBKR token is encrypted at rest. QuillAI only ever sees the trades for your own account."
              />
              <FAQItem
                q="Is it free?"
                a="Currently invite-only and free for the small set of traders using it. Reach out if you want access."
              />
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-6 py-20 md:py-28 text-center">
          <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12">
            <h2 className="text-2xl md:text-4xl font-semibold mb-5 leading-tight tracking-tight">
              Your next month{" "}
              <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                doesn&apos;t have to look like last month.
              </span>
            </h2>
            <p className="text-[14px] text-white/55 mb-7 max-w-md mx-auto">
              Three minutes to set up. The rest of your trading career to use.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[14px] font-medium"
            >
              Open your journal
              <i className="fa-solid fa-arrow-right text-[11px]" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-8 text-xs text-white/45">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <CuequillLogo className="h-4 w-auto opacity-60" />
            <span>© {new Date().getFullYear()} Cuequill</span>
          </div>
          <div className="text-white/40">
            AI by{" "}
            <a
              href="https://ai.google.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline-offset-4 hover:underline"
            >
              Google Gemini
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
