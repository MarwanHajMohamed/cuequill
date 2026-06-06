"use client";

import { motion } from "framer-motion";
import React, { useMemo, useState } from "react";

type Sector = "Index" | "Tech" | "Energy" | "Commodity" | "Financial" | "Health";

type Stock = {
  name: string;
  cost: string;
  volume: string;
  distance: string;
  sector: Sector;
};

const stockData: Stock[] = [
  { name: "SPY", cost: "0.25 – 0.30", volume: "20", distance: "10", sector: "Index" },
  { name: "QQQ", cost: "0.25 – 0.30", volume: "20", distance: "10", sector: "Index" },
  { name: "TNA", cost: "0.60 – 0.80", volume: "2", distance: "8 – 13", sector: "Index" },
  { name: "AAPL", cost: "0.45 – 0.80", volume: "20 – 25", distance: "2 – 4", sector: "Tech" },
  { name: "META", cost: "0.45 – 0.80", volume: "3", distance: "20 – 25", sector: "Tech" },
  { name: "AMZN", cost: "0.60 – 0.80", volume: "16", distance: "7 – 8", sector: "Tech" },
  { name: "NFLX", cost: "1.50 – 2.50", volume: "1", distance: "12 – 15", sector: "Tech" },
  { name: "TSLA", cost: "2.50", volume: "15", distance: "8 – 10", sector: "Tech" },
  { name: "NVDA", cost: "0.60 – 0.80", volume: "120", distance: "6 – 9", sector: "Tech" },
  { name: "MRNA", cost: "1.0 – 2.0", volume: "2", distance: "12 – 15", sector: "Health" },
  { name: "GLD", cost: "0.60 – 0.80", volume: "2", distance: "2 – 4", sector: "Commodity" },
  { name: "SLV", cost: "0.10 – 0.20", volume: "10", distance: "1 – 2", sector: "Commodity" },
  { name: "USO", cost: "0.10 – 0.20", volume: "1", distance: "2 – 3", sector: "Commodity" },
  { name: "BAC", cost: "0.10 – 0.20", volume: "10", distance: "1 – 2", sector: "Financial" },
  { name: "CVX", cost: "0.60 – 0.80", volume: "2", distance: "3 – 5", sector: "Energy" },
  { name: "XOM", cost: "0.60 – 0.80", volume: "4", distance: "3 – 5", sector: "Energy" },
];

const sectorStyles: Record<Sector, { bg: string; text: string; border: string }> = {
  Index: {
    bg: "bg-teal-500/10",
    text: "text-teal-300",
    border: "border-teal-500/25",
  },
  Tech: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-300",
    border: "border-indigo-500/25",
  },
  Energy: {
    bg: "bg-orange-500/10",
    text: "text-orange-300",
    border: "border-orange-500/25",
  },
  Commodity: {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/25",
  },
  Financial: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/25",
  },
  Health: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-300",
    border: "border-fuchsia-500/25",
  },
};

const sectors: ("All" | Sector)[] = [
  "All",
  "Index",
  "Tech",
  "Energy",
  "Commodity",
  "Financial",
  "Health",
];

export default function Page() {
  const [filter, setFilter] = useState<"All" | Sector>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      stockData.filter((s) => {
        const okSector = filter === "All" || s.sector === filter;
        const okQuery =
          !query || s.name.toLowerCase().includes(query.toLowerCase());
        return okSector && okQuery;
      }),
    [filter, query],
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

      {/* HERO */}
      <div className="w-full max-w-[1200px] mt-30 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-3 text-center items-center"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Watchlist
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Stocks & ETFs
            </span>
          </h1>
          <p className="text-sm md:text-[15px] text-white/55 max-w-xl leading-relaxed">
            Reference table for cost, volume, and strike distance per
            ticker. Filter by sector or search.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          className="mt-8 flex flex-col md:flex-row gap-3 items-stretch md:items-center"
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
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((s) => {
              const active = filter === s;
              const style = s !== "All" ? sectorStyles[s] : null;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition ${
                    active
                      ? style
                        ? `${style.bg} ${style.text} ${style.border}`
                        : "bg-white/10 text-white border-white/15"
                      : "bg-white/[0.02] text-white/55 border-white/10 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Table card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
                  <th className="py-3 px-5 font-medium">Ticker</th>
                  <th className="py-3 px-5 font-medium">Sector</th>
                  <th className="py-3 px-5 font-medium">Cost ($)</th>
                  <th className="py-3 px-5 font-medium">Volume (M)</th>
                  <th className="py-3 px-5 font-medium">Distance (spot – strike)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const style = sectorStyles[item.sector];
                  return (
                    <tr
                      key={item.name}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition"
                    >
                      <td className="py-3 px-5">
                        <span className="font-semibold text-[14px] tracking-tight">
                          {item.name}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {item.sector}
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
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-[13px] text-white/40">
                No tickers match.
              </div>
            )}
          </div>
        </motion.div>

        <div className="mt-3 text-[11px] text-white/40 text-right">
          Showing {filtered.length} of {stockData.length}
        </div>
      </div>
    </div>
  );
}
