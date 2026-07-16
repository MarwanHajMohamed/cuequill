"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useQuotes } from "@/hooks/useQuotes";
import { useOptionMarks, type MarkPosition } from "@/hooks/useOptionMarks";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { Trade } from "@/app/types/Trades";
import ViewTradeModal from "../modals/ViewTradeModal";
import { CARD_CLASS } from "../DashboardCard";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date) {
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / DAY_MS);
}

export default function DashboardOpenPositions({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades } = useTrades(userId, simulated);
  const [selected, setSelected] = useState<Trade | null>(null);

  const open = useMemo(() => {
    if (!trades) return [] as Trade[];
    return trades
      .filter((t) => t.status === "OPEN")
      .sort(
        (a, b) =>
          new Date(b.dateBought).getTime() - new Date(a.dateBought).getTime(),
      );
  }, [trades]);

  const shown = useMemo(() => open.slice(0, 5), [open]);

  // Real option marks (via Tradier, when configured) → genuine unrealized
  // P/L per position. Falls back to the underlying's move when the options
  // provider isn't set up.
  const markPositions = useMemo<MarkPosition[]>(
    () =>
      shown
        .filter((t) => t.expiryDate)
        .map((t) => ({
          symbol: t.symbol,
          expiry: new Date(t.expiryDate).toISOString().slice(0, 10),
          strike: t.strike,
          type: t.option,
        })),
    [shown],
  );
  const { configured: optionsConfigured, markFor } =
    useOptionMarks(markPositions);

  // Underlying quotes: the fallback directional read (share price + today's
  // move) used when we don't have a real option mark.
  const symbols = useMemo(
    () => Array.from(new Set(shown.map((t) => t.symbol))),
    [shown],
  );
  const { data: quotes } = useQuotes(symbols);

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">
          Open positions
          {open.length > 0 && (
            <span className="ml-2 text-xs text-white/40 font-normal">
              {open.length}
            </span>
          )}
        </h2>
        <Link
          href={`/trades/${userId}`}
          className="text-xs text-white/50 hover:text-white transition"
        >
          All trades <i className="fa-solid fa-chevron-right"></i>
        </Link>
      </div>

      {open.length === 0 ? (
        <div className="flex-1 text-sm text-white/40 py-6 flex items-center justify-center text-center border border-dashed border-white/10 rounded-md">
          Nothing currently open.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((t) => {
            const expiry = t.expiryDate ? new Date(t.expiryDate) : null;
            const daysToExpiry = expiry
              ? daysBetween(new Date(), new Date(expiry))
              : null;
            const expirySoon = daysToExpiry !== null && daysToExpiry <= 3;

            // Prefer a real option mark → unrealized P/L. Long option:
            // (mark − entry) × qty × 100.
            const mk = t.expiryDate
              ? markFor({
                  symbol: t.symbol,
                  expiry: new Date(t.expiryDate).toISOString().slice(0, 10),
                  strike: t.strike,
                  type: t.option,
                })
              : null;
            const mark = mk?.mark ?? null;
            const unreal =
              mark != null ? (mark - t.contractPrice) * t.qty * 100 : null;

            // Fallback: the underlying's move today.
            const q = quotes?.[t.symbol.toUpperCase()];
            const pct = q?.changePct ?? null;
            const pctColor =
              pct == null
                ? "text-white/40"
                : pct >= 0
                  ? "text-green-500"
                  : "text-red-500";
            return (
              <li key={t._id}>
                <button
                  onClick={() => setSelected(t)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition cursor-pointer"
                >
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      t.option === "CALL"
                        ? "bg-green-500/15 text-green-500"
                        : "bg-red-500/15 text-red-500"
                    }`}
                  >
                    {t.option}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm md:text-base font-medium text-white truncate">
                        {t.symbol}
                      </span>
                      <span className="text-xs text-white/40">
                        ${t.strike} ×{t.qty}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                      {daysToExpiry !== null && (
                        <span
                          className={
                            expirySoon
                              ? "text-red-500 font-medium"
                              : "text-white/40"
                          }
                        >
                          Exp in {daysToExpiry}d
                        </span>
                      )}
                    </div>
                  </div>
                  {mark != null ? (
                    <div className="flex flex-col items-end shrink-0 tabular-nums">
                      <span
                        className={`text-xs md:text-sm font-medium ${
                          unreal == null
                            ? "text-white/80"
                            : unreal >= 0
                              ? "text-green-500"
                              : "text-red-500"
                        }`}
                      >
                        {unreal != null ? fmtMoneySignedCompact(unreal) : "—"}
                      </span>
                      <span className="text-[10px] text-white/40">
                        @ ${mark.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    q && (
                      <div className="flex flex-col items-end shrink-0 tabular-nums">
                        <span className="text-xs md:text-sm text-white/80">
                          ${q.price.toFixed(2)}
                        </span>
                        {pct != null && (
                          <span className={`text-[10px] ${pctColor}`}>
                            {pct >= 0 ? "+" : ""}
                            {pct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )
                  )}
                  <i className="fa-solid fa-chevron-right text-[10px] text-white/30"></i>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open.length > 0 && (
        <p className="text-[10px] text-white/30 mt-auto pt-1">
          {optionsConfigured
            ? "Unrealized P/L at option mid · delayed."
            : "Underlying price · delayed. Options P/L differs."}
        </p>
      )}

      <AnimatePresence>
        {selected && (
          <ViewTradeModal
            key="open-view-trade"
            initialTrade={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
