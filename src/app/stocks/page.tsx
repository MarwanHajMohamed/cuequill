"use client";

import { motion } from "framer-motion";
import React, { useMemo, useState } from "react";

type Stock = {
  name: string;
  cost: string;
  volume: string;
  distance: string;
};

const stockData: Stock[] = [
  { name: "SPY", cost: "0.25 – 0.30", volume: "20", distance: "10" },
  { name: "QQQ", cost: "0.25 – 0.30", volume: "20", distance: "10" },
  { name: "TNA", cost: "0.60 – 0.80", volume: "2", distance: "8 – 13" },
  { name: "AAPL", cost: "0.45 – 0.80", volume: "20 – 25", distance: "2 – 4" },
  { name: "META", cost: "0.45 – 0.80", volume: "3", distance: "20 – 25" },
  { name: "AMZN", cost: "0.60 – 0.80", volume: "16", distance: "7 – 8" },
  { name: "NFLX", cost: "1.50 – 2.50", volume: "1", distance: "12 – 15" },
  { name: "TSLA", cost: "2.50", volume: "15", distance: "8 – 10" },
  { name: "NVDA", cost: "0.60 – 0.80", volume: "120", distance: "6 – 9" },
  { name: "MRNA", cost: "1.0 – 2.0", volume: "2", distance: "12 – 15" },
  { name: "GLD", cost: "0.60 – 0.80", volume: "2", distance: "2 – 4" },
  { name: "SLV", cost: "0.10 – 0.20", volume: "10", distance: "1 – 2" },
  { name: "USO", cost: "0.10 – 0.20", volume: "1", distance: "2 – 3" },
  { name: "BAC", cost: "0.10 – 0.20", volume: "10", distance: "1 – 2" },
  { name: "CVX", cost: "0.60 – 0.80", volume: "2", distance: "3 – 5" },
  { name: "XOM", cost: "0.60 – 0.80", volume: "4", distance: "3 – 5" },
];

export default function Page() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      stockData.filter(
        (s) => !query || s.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

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

      {/* HERO - same language as the Trades page. */}
      <div className="w-full max-w-[1500px] mt-30 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Watchlist
          </div>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Stocks & ETFs
              </span>
            </h1>
            <div className="text-[12px] text-white/45 tabular-nums">
              {filtered.length} of {stockData.length}
            </div>
          </div>
          <p className="text-[13px] md:text-[14px] text-white/55 max-w-xl leading-relaxed mt-1">
            Reference table for cost, volume, and strike distance per
            ticker.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          className="mt-8"
        >
          <div className="relative md:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[12px]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>
        </motion.div>

        {/* Table card - fixed layout so columns share width evenly. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[520px]">
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
                  <th className="py-3 px-5 font-medium">Ticker</th>
                  <th className="py-3 px-5 font-medium">Cost ($)</th>
                  <th className="py-3 px-5 font-medium">Volume (M)</th>
                  <th className="py-3 px-5 font-medium">
                    Distance (spot – strike)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.name}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition"
                  >
                    <td className="py-3 px-5">
                      <span className="font-semibold text-[14px] tracking-tight">
                        {item.name}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-[13px] text-white/80 tabular-nums">
                      {item.cost}
                    </td>
                    <td className="py-3 px-5 text-[13px] text-white/80 tabular-nums">
                      {item.volume}
                    </td>
                    <td className="py-3 px-5 text-[13px] text-white/80 tabular-nums">
                      {item.distance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-[13px] text-white/40">
                No tickers match.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
