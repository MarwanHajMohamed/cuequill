"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Trade } from "@/app/types/Trades";
import { useScrollLock } from "@/hooks/useScrollLock";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { motion, AnimatePresence } from "framer-motion";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";

// An economic event or company earnings landing on the day. Computed by the
// calendar and passed in so the modal stays presentational.
export type DayEvent = {
  kind: "fed" | "cpi" | "ppi" | "pce" | "holiday" | "earnings";
  label: string;
  detail?: string;
};

const EVENT_STYLE: Record<
  DayEvent["kind"],
  { icon: string; dot: string; chip: string }
> = {
  fed: {
    icon: "fa-landmark",
    dot: "bg-purple-400",
    chip: "bg-purple-500/12 text-purple-200 border-purple-400/30",
  },
  cpi: {
    icon: "fa-arrow-trend-up",
    dot: "bg-amber-400",
    chip: "bg-amber-500/12 text-amber-200 border-amber-400/30",
  },
  ppi: {
    icon: "fa-industry",
    dot: "bg-orange-400",
    chip: "bg-orange-500/12 text-orange-200 border-orange-400/30",
  },
  pce: {
    icon: "fa-gauge-high",
    dot: "bg-sky-400",
    chip: "bg-sky-500/12 text-sky-200 border-sky-400/30",
  },
  holiday: {
    icon: "fa-lock",
    dot: "bg-red-400",
    chip: "bg-red-500/12 text-red-200 border-red-400/30",
  },
  earnings: {
    icon: "fa-bullhorn",
    dot: "bg-teal-400",
    chip: "bg-teal-500/12 text-teal-200 border-teal-400/30",
  },
};

type Props = {
  date: Date;
  trades: Trade[];
  events?: DayEvent[];
  onClose: () => void;
  onAddTrade: () => void;
  onTradeClick: (trade: Trade) => void;
};

export default function DayTradesModal({
  date,
  trades,
  events = [],
  onClose,
  onAddTrade,
  onTradeClick,
}: Props) {
  useScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const closed = trades.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  );
  const wins = closed.filter((t) => t.status === "WIN").length;
  const losses = closed.filter((t) => t.status === "LOSS").length;
  const opens = trades.filter((t) => t.status === "OPEN").length;
  const netPL = closed.reduce((sum, t) => sum + tradeNetPL(t), 0);
  const showNet = closed.length > 0;
  const positive = netPL >= 0;
  const isToday =
    format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  // A hairline of accent colour along the very top, keyed to the day's result.
  const topAccent = !showNet
    ? "from-orange-400/70"
    : positive
      ? "from-green-400/70"
      : "from-red-400/70";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 modal-scrim backdrop-blur-md flex items-center justify-center z-50 p-3 md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ y: 14, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 14, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="relative flex flex-col bg-[var(--surface)] border border-white/10 rounded-3xl w-full max-w-md text-white max-h-[88vh] overflow-hidden shadow-[0_24px_80px_var(--shadow)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent hairline */}
          <div
            className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${topAccent} via-white/10 to-transparent`}
          />

          {/* Header */}
          <div className="relative shrink-0 px-5 pt-5 pb-4">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-[13px]" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-white/40 font-semibold">
                {format(date, "EEEE")}
              </span>
              {isToday && (
                <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/25">
                  TODAY
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[17px] md:text-lg font-semibold tracking-tight">
              {format(date, "MMMM d, yyyy")}
            </div>

            {/* Net P/L focal point */}
            {showNet ? (
              <div className="mt-4 flex items-end gap-2.5">
                <div
                  className={`flex items-center gap-1.5 text-[34px] leading-none font-bold tracking-tight tabular-nums ${
                    positive ? "text-green-300" : "text-red-300"
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      positive ? "fa-arrow-up" : "fa-arrow-down"
                    } text-[18px]`}
                  />
                  {fmtMoneySignedCompact(netPL)}
                </div>
                <div className="pb-1 text-[11px] uppercase tracking-wider text-white/40 font-medium">
                  Net P/L
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[13px] text-white/55">
                {opens > 0
                  ? `${opens} open ${opens === 1 ? "position" : "positions"} — no closes yet`
                  : "No closed trades"}
              </div>
            )}

            {/* Outcome chips */}
            {(wins > 0 || losses > 0 || opens > 0) && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {wins > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-green-500/12 text-green-200 border border-green-400/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {wins} {wins === 1 ? "win" : "wins"}
                  </span>
                )}
                {losses > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-red-500/12 text-red-200 border border-red-400/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {losses} {losses === 1 ? "loss" : "losses"}
                  </span>
                )}
                {opens > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-orange-500/12 text-orange-200 border border-orange-400/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    {opens} open
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Events on this day */}
          {events.length > 0 && (
            <div className="shrink-0 px-5 pb-4 pt-1">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 font-semibold mb-2">
                On this day
              </div>
              <div className="flex flex-col gap-1.5">
                {events.map((ev, i) => {
                  const s = EVENT_STYLE[ev.kind];
                  return (
                    <div
                      key={`${ev.kind}-${ev.label}-${i}`}
                      className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border ${s.chip}`}
                    >
                      <i
                        className={`fa-solid ${s.icon} text-[12px] w-4 text-center opacity-90`}
                      />
                      <span className="text-[12.5px] font-medium">
                        {ev.label}
                      </span>
                      {ev.detail && (
                        <span className="ml-auto text-[11px] text-white/45 font-medium">
                          {ev.detail}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trades */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-3 flex flex-col">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 font-semibold mb-2 flex items-center gap-2">
              Trades
              {trades.length > 0 && (
                <span className="text-white/30 tabular-nums font-bold">
                  {trades.length}
                </span>
              )}
            </div>
            {trades.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-white/40 border border-dashed border-white/10 rounded-xl">
                No trades logged on this day.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {trades.map((t, i) => {
                  const pl = tradeNetPL(t);
                  const isClosed = t.status === "WIN" || t.status === "LOSS";
                  const isWin = t.status === "WIN";
                  const dot = isWin
                    ? "bg-green-400"
                    : t.status === "LOSS"
                      ? "bg-red-400"
                      : "bg-orange-400";
                  return (
                    <button
                      key={t._id || `${t.symbol}-${t.dateBought}-${i}`}
                      onClick={() => onTradeClick(t)}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05] transition cursor-pointer text-left"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold tracking-tight">
                            {t.symbol}
                          </span>
                          <span
                            className={`text-[10.5px] font-bold tracking-wide ${
                              t.option === "CALL"
                                ? "text-green-300"
                                : "text-red-300"
                            }`}
                          >
                            {t.option}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-white/45 truncate tabular-nums">
                          ${t.strike} · {t.qty} qty ·{" "}
                          {format(new Date(t.expiryDate), "MMM d")}
                        </div>
                      </div>
                      {isClosed ? (
                        <div
                          className={`font-semibold tabular-nums text-[14px] shrink-0 ${
                            pl >= 0 ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {fmtMoneySignedCompact(pl)}
                        </div>
                      ) : (
                        <div className="text-[12px] font-medium text-orange-300/80 shrink-0">
                          Open
                        </div>
                      )}
                      <i className="fa-solid fa-chevron-right text-[10px] text-white/25 group-hover:text-white/70 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 border-t border-white/10">
            <button
              onClick={onAddTrade}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition font-semibold text-[13px] cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[11px]" />
              Add trade
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
