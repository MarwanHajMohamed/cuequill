"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Trade } from "@/app/types/Trades";
import { useScrollLock } from "@/hooks/useScrollLock";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { motion, AnimatePresence } from "framer-motion";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
type Props = {
  date: Date;
  trades: Trade[];
  onClose: () => void;
  onAddTrade: () => void;
  onTradeClick: (trade: Trade) => void;
};

export default function DayTradesModal({
  date,
  trades,
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
  const isToday =
    format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  // Hero tint follows the day's outcome - green if profitable, red if
  // not, neutral if only open positions.
  const heroTint = !showNet
    ? "from-orange-500/15 via-transparent to-transparent"
    : netPL >= 0
      ? "from-green-500/18 via-transparent to-transparent"
      : "from-red-500/18 via-transparent to-transparent";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-3 md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ y: 12, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="relative flex flex-col bg-[#0F0F17] border border-white/10 rounded-2xl w-full max-w-md text-white max-h-[88vh] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero */}
          <div
            className={`relative shrink-0 bg-gradient-to-b ${heroTint} p-5 md:p-6 border-b border-white/10`}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-[13px]" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium">
                {format(date, "EEE")}
              </span>
              {isToday && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/25">
                  Today
                </span>
              )}
            </div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">
              {format(date, "MMMM d, yyyy")}
            </div>

            {showNet ? (
              <div className="mt-3 flex items-baseline gap-3">
                <div
                  className={`text-3xl md:text-4xl font-semibold tracking-tight tabular-nums ${
                    netPL >= 0 ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {fmtMoneySignedCompact(netPL)}
                </div>
                <div className="text-[12px] text-white/45">net P/L</div>
              </div>
            ) : (
              <div className="mt-3 text-[13px] text-white/55">
                {opens > 0
                  ? `${opens} open ${opens === 1 ? "position" : "positions"} - no closes yet`
                  : "No closed trades"}
              </div>
            )}

            {/* Mini stats */}
            <div className="mt-4 flex items-center gap-2 flex-wrap text-[11px] font-medium">
              {wins > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/25">
                  <i className="fa-solid fa-arrow-trend-up text-[9px]" />
                  {wins} {wins === 1 ? "win" : "wins"}
                </span>
              )}
              {losses > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/25">
                  <i className="fa-solid fa-arrow-trend-down text-[9px]" />
                  {losses} {losses === 1 ? "loss" : "losses"}
                </span>
              )}
              {opens > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  {opens} open
                </span>
              )}
            </div>
          </div>

          {/* Trade list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 py-3 flex flex-col gap-2">
            {trades.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-white/45">
                No trades on this day.
              </div>
            ) : (
              trades.map((t, i) => {
                const pl = tradeNetPL(t);
                const isClosed = t.status === "WIN" || t.status === "LOSS";
                const isWin = t.status === "WIN";
                const accent = isWin
                  ? "bg-green-400"
                  : t.status === "LOSS"
                    ? "bg-red-400"
                    : "bg-orange-400";
                return (
                  <button
                    key={t._id || `${t.symbol}-${t.dateBought}-${i}`}
                    onClick={() => onTradeClick(t)}
                    className="group relative shrink-0 flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05] transition cursor-pointer text-left overflow-hidden"
                  >
                    {/* Status accent stripe */}
                    <span
                      className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${accent}`}
                    />
                    <div className="flex flex-col gap-1 min-w-0 pl-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold tracking-tight">
                          {t.symbol}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full border ${
                            t.option === "CALL"
                              ? "bg-green-500/10 text-green-300 border-green-500/25"
                              : "bg-red-500/10 text-red-300 border-red-500/25"
                          }`}
                        >
                          {t.option}
                        </span>
                        {t.status === "OPEN" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/25 font-semibold uppercase tracking-wider">
                            Open
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-white/45 truncate tabular-nums">
                        Strike {t.strike} · Exp{" "}
                        {format(new Date(t.expiryDate), "MMM d")} · Qty {t.qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isClosed ? (
                        <div
                          className={`font-semibold tabular-nums text-[14px] ${
                            pl >= 0 ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {fmtMoneySignedCompact(pl)}
                        </div>
                      ) : (
                        <div className="text-white/35 text-[13px]">-</div>
                      )}
                      <i className="fa-solid fa-chevron-right text-[10px] text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-3 md:p-4 border-t border-white/10">
            <button
              onClick={onAddTrade}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/25 transition font-medium text-[13px] cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[11px]" />
              Add trade to this day
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
