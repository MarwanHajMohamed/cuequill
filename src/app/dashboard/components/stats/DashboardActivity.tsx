"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { Trade } from "@/app/types/Trades";
import ViewTradeModal from "../modals/ViewTradeModal";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
/**
 * Two practical at-a-glance widgets that surface what the trader needs
 * to act on:
 *
 *   • Open Positions - what's still alive, days held, days to expiry
 *     (red badge if ≤3). Tap to drill into the trade on the charts page.
 *   • Recent Closes - last 5 realized trades with net P/L, strategy,
 *     time ago. Quick scan of how the past week's decisions played out.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date) {
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / DAY_MS);
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function DashboardActivity({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);
  const [selected, setSelected] = useState<Trade | null>(null);

  const { open, recent } = useMemo(() => {
    if (!trades) return { open: [] as Trade[], recent: [] as Trade[] };
    const today = new Date();
    const openTrades = trades
      .filter((t) => t.status === "OPEN")
      .sort(
        (a, b) =>
          new Date(b.dateBought).getTime() - new Date(a.dateBought).getTime(),
      );
    const recentClosed = trades
      .filter((t) => t.status === "WIN" || t.status === "LOSS")
      .sort(
        (a, b) =>
          new Date(b.dateClosed || b.dateBought).getTime() -
          new Date(a.dateClosed || a.dateBought).getTime(),
      )
      .slice(0, 5);
    void today;
    return { open: openTrades, recent: recentClosed };
  }, [trades]);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 text-xs text-white/40">
        Loading…
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <OpenPositions trades={open} userId={userId} onSelect={setSelected} />
        <RecentCloses trades={recent} userId={userId} onSelect={setSelected} />
      </div>
      <AnimatePresence>
        {selected && (
          <ViewTradeModal
            key="dash-view-trade"
            initialTrade={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Open Positions ──────────────────────────────────────────────────
function OpenPositions({
  trades,
  userId,
  onSelect,
}: {
  trades: Trade[];
  userId: string;
  onSelect: (t: Trade) => void;
}) {
  return (
    <section className="flex-1 min-w-0 border border-[#282828] rounded-lg p-4 md:p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">
          Open positions
          {trades.length > 0 && (
            <span className="ml-2 text-xs text-white/40 font-normal">
              {trades.length}
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

      {trades.length === 0 ? (
        <div className="text-sm text-white/40 py-6 text-center border border-dashed border-white/10 rounded-md">
          Nothing currently open.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {trades.slice(0, 5).map((t) => {
            const bought = new Date(t.dateBought);
            const expiry = t.expiryDate ? new Date(t.expiryDate) : null;
            const heldDays = daysBetween(new Date(bought), new Date());
            const daysToExpiry = expiry
              ? daysBetween(new Date(), new Date(expiry))
              : null;
            const expirySoon = daysToExpiry !== null && daysToExpiry <= 3;
            return (
              <li key={t._id}>
                <button
                  onClick={() => onSelect(t)}
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
                        ${t.strike} · ×{t.qty}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/40">
                      Held {heldDays}d
                      {daysToExpiry !== null && (
                        <>
                          {" · "}
                          <span
                            className={
                              expirySoon
                                ? "text-red-500 font-medium"
                                : "text-white/40"
                            }
                          >
                            Exp in {daysToExpiry}d
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[10px] text-white/30"></i>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Recent Closes ───────────────────────────────────────────────────
function RecentCloses({
  trades,
  userId,
  onSelect,
}: {
  trades: Trade[];
  userId: string;
  onSelect: (t: Trade) => void;
}) {
  return (
    <section className="flex-1 min-w-0 border border-[#282828] rounded-lg p-4 md:p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">Recent closes</h2>
        <Link
          href={`/trades/${userId}`}
          className="text-xs text-white/50 hover:text-white transition"
        >
          All trades <i className="fa-solid fa-chevron-right"></i>
        </Link>
      </div>

      {trades.length === 0 ? (
        <div className="text-sm text-white/40 py-6 text-center border border-dashed border-white/10 rounded-md">
          No closed trades yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {trades.map((t) => {
            const pl = tradeNetPL(t);
            const win = t.status === "WIN";
            return (
              <li key={t._id}>
                <button
                  onClick={() => onSelect(t)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition cursor-pointer"
                >
                  <span
                    className={`w-1 h-8 rounded-full shrink-0 ${
                      win ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm md:text-base font-medium text-white truncate">
                        {t.symbol}
                      </span>
                      <span className="text-[10px] text-white/40 truncate">
                        {t.strategy && t.strategy !== "All"
                          ? t.strategy
                          : t.option}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/40">
                      {t.dateClosed
                        ? relativeTime(t.dateClosed)
                        : relativeTime(t.dateBought)}
                    </div>
                  </div>
                  <span
                    className={`text-sm md:text-base font-semibold whitespace-nowrap ${
                      pl >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {fmtMoneySignedCompact(pl)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
