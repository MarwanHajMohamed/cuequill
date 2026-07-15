"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { Trade } from "@/app/types/Trades";
import ViewTradeModal from "../modals/ViewTradeModal";
import { CARD_CLASS } from "../DashboardCard";

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

export default function DashboardRecentCloses({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades } = useTrades(userId, simulated);
  const [selected, setSelected] = useState<Trade | null>(null);

  const recent = useMemo(() => {
    if (!trades) return [] as Trade[];
    return trades
      .filter((t) => t.status === "WIN" || t.status === "LOSS")
      .sort(
        (a, b) =>
          new Date(b.dateClosed || b.dateBought).getTime() -
          new Date(a.dateClosed || a.dateBought).getTime(),
      )
      .slice(0, 5);
  }, [trades]);

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">Recent closes</h2>
        <Link
          href={`/trades/${userId}`}
          className="text-xs text-white/50 hover:text-white transition"
        >
          All trades <i className="fa-solid fa-chevron-right"></i>
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex-1 text-sm text-white/40 py-6 flex items-center justify-center text-center border border-dashed border-white/10 rounded-md">
          No closed trades yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {recent.map((t) => {
            const pl = tradeNetPL(t);
            const win = t.status === "WIN";
            return (
              <li key={t._id}>
                <button
                  onClick={() => setSelected(t)}
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
                    </div>
                    <div className="text-[11px] text-white/40">
                      {t.dateClosed
                        ? relativeTime(t.dateClosed)
                        : relativeTime(t.dateBought)}
                    </div>
                  </div>
                  <span
                    className={`text-sm md:text-base font-normal whitespace-nowrap ${
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

      <AnimatePresence>
        {selected && (
          <ViewTradeModal
            key="recent-view-trade"
            initialTrade={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
