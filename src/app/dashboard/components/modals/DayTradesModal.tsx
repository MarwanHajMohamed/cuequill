"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Trade } from "@/app/types/Trades";
import { useScrollLock } from "@/hooks/useScrollLock";

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
    (t) => t.status === "WIN" || t.status === "LOSS"
  );
  const netPL = closed.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);
  const showNet = closed.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col gap-4 bg-[#0F0F17] p-5 md:p-6 rounded-xl w-full max-w-md text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base md:text-lg font-semibold">
              {format(date, "EEEE, MMM d, yyyy")}
            </div>
            <div className="text-sm text-white/50 mt-0.5">
              {trades.length} {trades.length === 1 ? "trade" : "trades"}
              {showNet && (
                <>
                  {" · "}
                  <span
                    className={
                      netPL >= 0 ? "text-green-500" : "text-red-500"
                    }
                  >
                    {netPL >= 0 ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none cursor-pointer shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Trade list */}
        <div className="flex flex-col gap-2">
          {trades.map((t, i) => {
            const pl = t.profitLoss ?? 0;
            const isClosed = t.status === "WIN" || t.status === "LOSS";
            return (
              <button
                key={t._id || `${t.symbol}-${t.dateBought}-${i}`}
                onClick={() => onTradeClick(t)}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#282828] hover:border-white/30 hover:bg-white/5 transition cursor-pointer text-left"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.symbol}</span>
                    <span
                      className={`text-[10px] uppercase font-semibold ${
                        t.option === "CALL"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {t.option}
                    </span>
                    {t.status === "OPEN" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-semibold uppercase">
                        Open
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    Strike {t.strike} · Exp{" "}
                    {format(new Date(t.expiryDate), "MMM d")} · Qty {t.qty}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {isClosed ? (
                    <div
                      className={`font-semibold ${
                        pl >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {pl >= 0 ? "+" : "−"}${Math.abs(pl).toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-white/40 text-sm">—</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Add Trade button */}
        <button
          onClick={onAddTrade}
          className="w-full py-2.5 rounded-md bg-teal-500 hover:bg-teal-600 transition font-medium text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-plus text-xs" />
          Add trade
        </button>
      </div>
    </div>
  );
}
