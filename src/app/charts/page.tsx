"use client";
import { withAuth } from "@/lib/withAuth";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import ChartView from "./ChartView";
import { useSearchParams, useRouter } from "next/navigation";

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function Page() {
  const params = useSearchParams();
  const router = useRouter();
  const symbol = (params.get("symbol") || "SPY").toUpperCase();
  const entryParam = params.get("entry");
  const exitParam = params.get("exit");
  const plParam = params.get("pl");
  const pl = plParam !== null ? parseFloat(plParam) : null;

  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchInput.trim().toUpperCase();
    if (!next || next === symbol) return;
    router.push(`/charts?symbol=${encodeURIComponent(next)}`);
    setSearchInput("");
  };

  const entryDate = useMemo(
    () => (entryParam ? new Date(entryParam) : null),
    [entryParam]
  );
  const exitDate = useMemo(
    () => (exitParam ? new Date(exitParam) : null),
    [exitParam]
  );

  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBars = useCallback(async (sym: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/charts/bars?symbol=${encodeURIComponent(sym)}&days=59`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setBars(data.bars);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBars(symbol);
  }, [symbol, fetchBars]);

  return (
    <div className="md:mt-[100px] mt-19 flex flex-col items-center">
      <div className="bg-[#0e0e10] w-full rounded-sm h-[calc(100vh-77px)] md:h-[calc(100vh-105px)] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0 flex-wrap">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40"></i>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={symbol}
                className="bg-[#16151B] border border-white/10 text-white text-xs pl-7 pr-3 py-1.5 rounded-md focus:outline-none focus:border-white/30 w-32 uppercase placeholder:normal-case placeholder:text-white/30"
              />
            </div>
          </form>

          {(entryDate || exitDate || pl !== null) && (
            <div className="text-xs text-white/60 flex items-center gap-3 flex-wrap">
              {entryDate && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  Entry {entryDate.toLocaleString()}
                </span>
              )}
              {exitDate && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                  Exit {exitDate.toLocaleString()}
                </span>
              )}
              {pl !== null && !isNaN(pl) && (
                <span
                  className={`font-medium ${
                    pl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  P/L {pl >= 0 ? "+" : "−"}${Math.abs(pl).toFixed(2)}
                </span>
              )}
            </div>
          )}
          <div className="text-xs text-white/40 ml-auto">
            {loading ? "Loading…" : symbol}
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm z-10">
              {error}
            </div>
          )}
          <ChartView bars={bars} entry={entryDate} exit={exitDate} />
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
