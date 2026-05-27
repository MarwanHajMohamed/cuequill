"use client";
import { withAuth } from "@/lib/withAuth";
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import ChartView from "./ChartView";
import { useSearchParams, useRouter } from "next/navigation";
import { useTrades } from "@/hooks/useTrades";
import { Trade } from "@/app/types/Trades";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";

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
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const symbol = (params.get("symbol") || "SPY").toUpperCase();
  const entryParam = params.get("entry");
  const exitParam = params.get("exit");
  const plParam = params.get("pl");
  const selectedId = params.get("tradeId");
  const pl = plParam !== null ? parseFloat(plParam) : null;

  const [searchInput, setSearchInput] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchInput.trim().toUpperCase();
    if (!next || next === symbol) return;
    router.push(`/charts?symbol=${encodeURIComponent(next)}`);
    setSearchInput("");
  };

  // Type-to-search: focus the search input when the user starts typing,
  // unless they're already in an input/textarea or using a modifier key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return;
      if (!/^[a-zA-Z0-9]$/.test(e.key)) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      )
        return;
      const input = searchRef.current ?? mobileSearchRef.current;
      if (!input) return;
      e.preventDefault();
      input.focus();
      setSearchInput((prev) => (prev + e.key).toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        `/api/charts/bars?symbol=${encodeURIComponent(sym)}`
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

  const { data: allTrades } = useTrades(userId);

  const symbolTrades = useMemo(() => {
    if (!allTrades) return [];
    return allTrades
      .filter((t) => t.symbol?.toUpperCase() === symbol)
      .sort(
        (a, b) =>
          new Date(b.dateBought).getTime() - new Date(a.dateBought).getTime()
      );
  }, [allTrades, symbol]);

  const selectedTrade = useMemo(() => {
    if (!allTrades || !selectedId) return null;
    return allTrades.find((t) => t._id === selectedId) ?? null;
  }, [allTrades, selectedId]);

  const handleSelectTrade = (trade: Trade) => {
    const qs = new URLSearchParams();
    qs.set("symbol", trade.symbol.toUpperCase());
    if (trade.dateBought) qs.set("entry", trade.dateBought);
    if (trade.dateClosed) qs.set("exit", trade.dateClosed);
    if (trade.profitLoss !== null && trade.profitLoss !== undefined)
      qs.set("pl", String(trade.profitLoss));
    if (trade._id) qs.set("tradeId", trade._id);
    router.push(`/charts?${qs.toString()}`);
  };

  const clearSelection = () => {
    router.push(`/charts?symbol=${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="md:mt-[100px] mt-19 flex flex-col items-center">
      <div className="bg-[#0e0e10] w-full rounded-sm h-[calc(100vh-77px)] md:h-[calc(100vh-105px)] overflow-hidden flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-white/10 overflow-hidden">
          <div className="p-3 border-b border-white/10 shrink-0">
            <form onSubmit={handleSearch} className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40"></i>
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search (${symbol})`}
                className="bg-[#16151B] border border-white/10 text-white text-xs pl-7 pr-3 py-2 rounded-md focus:outline-none focus:border-white/30 w-full uppercase placeholder:normal-case placeholder:text-white/30"
              />
            </form>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedTrade ? (
              <TradeDetails
                trade={selectedTrade}
                onBack={clearSelection}
              />
            ) : (
              <TradeList
                trades={symbolTrades}
                symbol={symbol}
                onSelect={handleSelectTrade}
              />
            )}
          </div>
        </aside>

        {/* Chart area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0 flex-wrap md:hidden">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40"></i>
                <input
                  ref={mobileSearchRef}
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
    </div>
  );
}

function TradeList({
  trades,
  symbol,
  onSelect,
}: {
  trades: Trade[];
  symbol: string;
  onSelect: (t: Trade) => void;
}) {
  if (trades.length === 0) {
    return (
      <div className="p-4 text-xs text-white/40">
        No trades on {symbol}.
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/5">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/40">
        {trades.length} trade{trades.length === 1 ? "" : "s"} on {symbol}
      </div>
      {trades.map((t) => {
        const pl = t.profitLoss ?? 0;
        const date = t.dateBought
          ? new Date(t.dateBought).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "2-digit",
            })
          : "—";
        const isWin = t.status === "WIN";
        const isLoss = t.status === "LOSS";
        return (
          <button
            key={t._id}
            onClick={() => onSelect(t)}
            className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/80">{date}</span>
              <span
                className={`text-xs font-medium ${
                  isWin
                    ? "text-green-500"
                    : isLoss
                    ? "text-red-500"
                    : "text-white/50"
                }`}
              >
                {pl >= 0 ? "+" : "−"}${Math.abs(pl).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span
                className={`px-1.5 py-0.5 rounded ${
                  t.option === "CALL"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {t.option}
              </span>
              <span>${t.strike}</span>
              <span>×{t.qty}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TradeDetails({
  trade,
  onBack,
}: {
  trade: Trade;
  onBack: () => void;
}) {
  const pl = trade.profitLoss ?? 0;
  const isWin = trade.status === "WIN";
  const isLoss = trade.status === "LOSS";
  const entry = trade.dateBought ? new Date(trade.dateBought) : null;
  const exit = trade.dateClosed ? new Date(trade.dateClosed) : null;
  const expiry = trade.expiryDate ? new Date(trade.expiryDate) : null;

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <button
          onClick={onBack}
          className="text-xs text-white/60 hover:text-white flex items-center gap-1"
        >
          <i className="fa-solid fa-arrow-left text-[10px]"></i> Back
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white">
              {trade.symbol}
            </span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded ${
                trade.option === "CALL"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {trade.option}
            </span>
          </div>
          <span
            className={`text-sm font-medium ${
              isWin
                ? "text-green-500"
                : isLoss
                ? "text-red-500"
                : "text-white/50"
            }`}
          >
            {pl >= 0 ? "+" : "−"}${Math.abs(pl).toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <DetailRow label="Status" value={trade.status} />
          <DetailRow label="Strike" value={`$${trade.strike}`} />
          <DetailRow label="Qty" value={String(trade.qty)} />
          <DetailRow
            label="Contract"
            value={`$${trade.contractPrice?.toFixed?.(2) ?? trade.contractPrice}`}
          />
          {trade.closingContractPrice != null && (
            <DetailRow
              label="Close"
              value={`$${trade.closingContractPrice.toFixed(2)}`}
            />
          )}
          {expiry && (
            <DetailRow
              label="Expiry"
              value={expiry.toLocaleDateString()}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          {entry && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
              <span className="text-white/40">Entry</span>
              <span className="text-white/80 ml-auto">
                {entry.toLocaleString()}
              </span>
            </div>
          )}
          {exit && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span className="text-white/40">Exit</span>
              <span className="text-white/80 ml-auto">
                {exit.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {trade.strategy && trade.strategy !== "All" && (
          <div className="text-xs">
            <div className="text-white/40 mb-1">Strategy</div>
            <div className="text-white/80">{trade.strategy}</div>
          </div>
        )}

        {trade.tags && trade.tags.length > 0 && (
          <div className="text-xs">
            <div className="text-white/40 mb-1.5">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {trade.tags.map((tag) => {
                const kind = TAG_KIND_BY_LABEL[tag];
                return (
                  <span
                    key={tag}
                    className={`px-2 py-0.5 rounded-full text-[11px] ${
                      kind === "good"
                        ? "bg-green-500/10 text-green-400"
                        : kind === "mistake"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {trade.notes && (
          <div className="text-xs">
            <div className="text-white/40 mb-1">Notes</div>
            <div className="text-white/80 whitespace-pre-wrap bg-white/5 rounded p-2">
              {trade.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-white/40 text-[10px] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}

export default withAuth(Page);
