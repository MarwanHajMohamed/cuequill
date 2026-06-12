"use client";

import { withAuth } from "@/lib/withAuth";
import { motion, AnimatePresence } from "framer-motion";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";

type Quote = {
  symbol: string;
  marketState: string;
  price: number;
  change: number;
  changePct: number;
  regularPrice: number;
  prevClose: number;
  extended: boolean;
  ts: number;
};

// Core watchlist shown to everyone; users can add more (persisted locally).
const DEFAULT_SYMBOLS = [
  "SPY",
  "QQQ",
  "AAPL",
  "MSFT",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "NFLX",
  "GLD",
];

// How often the page asks the server for fresh quotes. The server caches
// per-symbol so this can be brisk without hammering the upstream feed.
const POLL_MS = 10_000;

type Session = "pre" | "open" | "after" | "closed";

function currentSession(): Session {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday");
  if (wd === "Sat" || wd === "Sun") return "closed";
  const mins = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  if (mins >= 240 && mins < 570) return "pre"; // 4:00–9:30 ET
  if (mins >= 570 && mins < 960) return "open"; // 9:30–16:00 ET
  if (mins >= 960 && mins < 1200) return "after"; // 16:00–20:00 ET
  return "closed";
}

const SESSION_META: Record<
  Session,
  { label: string; cls: string; dot: string }
> = {
  pre: {
    label: "Pre-market",
    cls: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    dot: "bg-amber-400",
  },
  open: {
    label: "Market open",
    cls: "bg-green-500/10 text-green-400 border-green-500/20",
    dot: "bg-green-400",
  },
  after: {
    label: "After-hours",
    cls: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
    dot: "bg-indigo-400",
  },
  closed: {
    label: "Market closed",
    cls: "bg-white/[0.04] text-white/55 border-white/10",
    dot: "bg-white/40",
  },
};

const fmtPrice = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = (n: number) =>
  `${n >= 0 ? "+" : "−"}${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Page() {
  const toast = useToast();
  const [custom, setCustom] = useLocalStorage<string[]>(
    "cuequill:markets:watch",
    [],
  );
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const symbols = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_SYMBOLS, ...custom])).slice(0, 20),
    [custom],
  );
  const symbolsKey = symbols.join(",");

  // Keep the latest symbol list in a ref so the polling interval always
  // fetches the current set without being re-created on every change.
  const symbolsRef = useRef(symbolsKey);
  useEffect(() => {
    symbolsRef.current = symbolsKey;
  }, [symbolsKey]);

  const load = useCallback(async () => {
    const syms = symbolsRef.current;
    if (!syms) return;
    try {
      const res = await fetch(`/api/markets/quote?symbols=${syms}`);
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json();
      const next: Record<string, Quote> = {};
      for (const q of data.quotes as Quote[]) next[q.symbol] = q;
      setQuotes((prev) => ({ ...prev, ...next }));
      setStatus("ok");
      setUpdatedAt(Date.now());
    } catch {
      setStatus("error");
    }
  }, []);

  // Poll on mount, on an interval, and whenever the tab regains focus.
  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  // Refetch immediately when the symbol set changes (e.g. after adding).
  useEffect(() => {
    if (status !== "loading") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  const addSymbol = async () => {
    const sym = query.trim().toUpperCase();
    if (!sym || adding) return;
    if (symbols.includes(sym)) {
      setQuery("");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/markets/quote?symbols=${sym}`);
      const data = await res.json().catch(() => ({}));
      const q = (data?.quotes as Quote[] | undefined)?.[0];
      if (!q) {
        toast(`No live data for ${sym}`);
        return;
      }
      setQuotes((prev) => ({ ...prev, [sym]: q }));
      setCustom((prev) => Array.from(new Set([...prev, sym])));
      setQuery("");
    } catch {
      toast("Couldn't add symbol");
    } finally {
      setAdding(false);
    }
  };

  const removeSymbol = (sym: string) =>
    setCustom((prev) => prev.filter((s) => s !== sym));

  const session = currentSession();
  const meta = SESSION_META[session];
  const isCustom = (s: string) => custom.includes(s);

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1100px] mt-30 px-5 md:px-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Live
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Markets
              </span>
            </h1>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium ${meta.cls}`}
            >
              <span className="relative flex w-1.5 h-1.5">
                {(session === "pre" || session === "open") && (
                  <span
                    className={`absolute inset-0 rounded-full ${meta.dot} animate-ping opacity-75`}
                  />
                )}
                <span
                  className={`relative inline-flex w-1.5 h-1.5 rounded-full ${meta.dot}`}
                />
              </span>
              {meta.label}
            </div>
          </div>
        </motion.div>

        {/* Search / add */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          onSubmit={(e) => {
            e.preventDefault();
            addSymbol();
          }}
          className="mt-8 flex items-center gap-2"
        >
          <div className="relative flex-1 md:flex-initial md:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[12px]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add a ticker…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] uppercase text-white placeholder:text-white/40 placeholder:normal-case focus:outline-none focus:border-white/20"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || adding}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] font-medium transition ${
              !query.trim() || adding
                ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                : "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
            }`}
          >
            <i className="fa-solid fa-plus text-[10px]" />
            Add
          </button>
        </motion.form>

        {/* Body */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
          className="mt-6"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed min-w-[520px]">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[26%]" />
                    <col className="w-[26%]" />
                    <col className="w-[26%]" />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
                      <th className="py-3 px-5 font-medium">Ticker</th>
                      <th className="py-3 px-5 font-medium text-right">Price</th>
                      <th className="py-3 px-5 font-medium text-right">
                        Change
                      </th>
                      <th className="py-3 px-5 font-medium text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {symbols.map((sym) => {
                        const q = quotes[sym];
                        const up = (q?.change ?? 0) >= 0;
                        const color = !q
                          ? "text-white/40"
                          : up
                            ? "text-green-400"
                            : "text-red-400";
                        return (
                          <motion.tr
                            key={sym}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="group border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition"
                          >
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[14px] tracking-tight">
                                  {sym}
                                </span>
                                {q?.extended && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                                    {q.marketState === "POST" ||
                                    q.marketState === "POSTPOST"
                                      ? "AH"
                                      : "PRE"}
                                  </span>
                                )}
                                {isCustom(sym) && (
                                  <button
                                    onClick={() => removeSymbol(sym)}
                                    aria-label={`Remove ${sym}`}
                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition text-white/30 hover:text-red-400 text-[11px] cursor-pointer"
                                  >
                                    <i className="fa-solid fa-xmark" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-5 text-right text-[13.5px] text-white/90 tabular-nums">
                              {q ? fmtPrice(q.price) : "—"}
                            </td>
                            <td
                              className={`py-3 px-5 text-right text-[13.5px] tabular-nums ${color}`}
                            >
                              {q ? fmtSigned(q.change) : "—"}
                            </td>
                            <td
                              className={`py-3 px-5 text-right text-[13.5px] tabular-nums ${color}`}
                            >
                              {q ? `${fmtSigned(q.changePct)}%` : "—"}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>

          {/* Footer status */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
            <span>
              Change is vs previous close ·{" "}
              {session === "pre"
                ? "premarket"
                : session === "after"
                  ? "after-hours"
                  : session === "open"
                    ? "regular session"
                    : "last close"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {status === "error" ? (
                <span className="text-red-400/80">Connection issue</span>
              ) : updatedAt ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Live · updates every {POLL_MS / 1000}s
                </>
              ) : (
                "Loading…"
              )}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default withAuth(Page);
