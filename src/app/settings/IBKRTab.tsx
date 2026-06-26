"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const COOLDOWN_MS = 15 * 60 * 1000;

const inputClass =
  "w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none transition";

type ImportedTrade = {
  _id: string;
  symbol: string;
  option: "CALL" | "PUT";
  strike: number;
  qty: number;
  contractPrice: number;
  closingContractPrice?: number | null;
  dateBought: string;
  dateClosed?: string | null;
  expiryDate?: string | null;
  profitLoss?: number | null;
  fees?: number | null;
  status: "WIN" | "LOSS" | "OPEN";
  hasDuplicate?: boolean;
};

export default function IBKRTab() {
  const [token, setToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastInserted, setLastInserted] = useState<number | null>(null);
  const [lastSkipped, setLastSkipped] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Last-imported viewer state
  const [importedOpen, setImportedOpen] = useState(false);
  const [importedLoading, setImportedLoading] = useState(false);
  const [importedTrades, setImportedTrades] = useState<ImportedTrade[]>([]);
  const [importedError, setImportedError] = useState("");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/user/ibkr-settings")
      .then((r) => r.json())
      .then((data) => {
        setQueryId(data.ibkrQueryId ?? "");
        setHasToken(data.hasToken ?? false);
        setLastSync(data.ibkrLastSync ?? null);
        setLastInserted(data.ibkrLastSyncInserted ?? null);
        setLastSkipped(data.ibkrLastSyncSkipped ?? null);
      });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cooldownMsLeft = useMemo(() => {
    if (!lastSync) return 0;
    const elapsed = now - new Date(lastSync).getTime();
    return Math.max(0, COOLDOWN_MS - elapsed);
  }, [lastSync, now]);

  const cooldownLabel = useMemo(() => {
    if (cooldownMsLeft <= 0) return "";
    const total = Math.ceil(cooldownMsLeft / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [cooldownMsLeft]);

  const handleSave = async () => {
    setSaveStatus("Saving…");
    const body: Record<string, string> = { ibkrQueryId: queryId };
    if (token) body.ibkrToken = token;

    const res = await fetch("/api/user/ibkr-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSaveStatus("Saved");
      if (token) {
        setHasToken(true);
        setToken("");
      }
    } else {
      setSaveStatus("Error saving");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus("Syncing with IBKR…");

    const res = await fetch("/api/ibkr/sync", { method: "POST" });
    const data = await res.json();

    setSyncing(false);
    if (res.ok) {
      setSyncStatus(
        `Done - ${data.inserted} trade${data.inserted !== 1 ? "s" : ""} imported`,
      );
      setLastSync(new Date().toISOString());
      setLastInserted(data.inserted);
      setLastSkipped(data.skipped);
      // If a panel was open, refresh; otherwise let user open it.
      if (importedOpen) loadImported();
    } else {
      setSyncStatus(`Error: ${data.error}`);
    }
  };

  const loadImported = async () => {
    setImportedLoading(true);
    setImportedError("");
    try {
      const r = await fetch("/api/ibkr/last-imported");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to load imported trades");
      setImportedTrades(d.trades ?? []);
    } catch (e) {
      setImportedError(e instanceof Error ? e.message : "Failed to load");
      setImportedTrades([]);
    } finally {
      setImportedLoading(false);
    }
  };

  const handleToggleImported = () => {
    const next = !importedOpen;
    setImportedOpen(next);
    if (next && importedTrades.length === 0 && !importedLoading) {
      loadImported();
    }
  };

  const handleDeleteImported = async (id: string) => {
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      const r = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      // Optimistic remove from list.
      setImportedTrades((trades) => trades.filter((t) => t._id !== id));
    } catch (e) {
      setImportedError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    }
  };

  const cooldownActive = cooldownMsLeft > 0;
  const syncDisabled = syncing || !hasToken || !queryId || cooldownActive;

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      {/* Intro */}
      <section className="flex flex-col gap-2">
        <div className="text-[11px] tracking-[0.1em] text-teal-400/80 font-medium">
          Auto-sync
        </div>
        <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
          Trades import automatically every weekday at 10 PM UTC. You can also
          trigger a sync manually below.
        </p>
      </section>

      {/* Setup steps */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] tracking-[0.1em] text-white/45 font-medium">
          Setup
        </div>
        <ol className="flex flex-col gap-2.5 text-[13px] text-white/75 leading-relaxed">
          {[
            <>
              In IBKR Account Management, open{" "}
              <span className="text-white">
                Performance &amp; Reports &rsaquo; Flex Queries &rsaquo; Flex Web
                Service Configuration
              </span>{" "}
              and generate a token.
            </>,
            <>
              Go to{" "}
              <span className="text-white">Reports &rsaquo; Flex Queries</span>{" "}
              and create a new{" "}
              <span className="text-white">Activity Flex Query</span>.
            </>,
            <>
              Under <span className="text-white">Trades</span>, select: Symbol,
              Strike, Date/Time, Expiry, Put/Call, Quantity, Buy/Sell,
              TradePrice, Realized P/L, TradeID,{" "}
              <span className="text-white">IBCommission</span>, and{" "}
              <span className="text-white">Taxes</span> (the last two let
              Cuequill populate fees automatically).
            </>,
            <>
              Set <span className="text-white">Period</span> to{" "}
              <span className="text-white">Last Business Day</span> and{" "}
              <span className="text-white">Format</span> to{" "}
              <span className="text-white">CSV</span>.
            </>,
            <>Save the query and note the numeric Query ID shown next to it.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[11px] tabular-nums text-white/55 font-semibold">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="h-px bg-white/10" />

      {/* Credentials */}
      <section className="flex flex-col gap-4 max-w-sm">
        <div className="text-[11px] tracking-[0.1em] text-white/45 font-medium">
          Credentials
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium flex items-center gap-2">
            Flex web service token
            {hasToken && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 text-[10px] tracking-normal normal-case font-medium">
                <i className="fa-solid fa-check text-[8px]" /> Saved
              </span>
            )}
          </span>
          <input
            className={inputClass}
            type="password"
            placeholder={hasToken ? "Enter new token to replace" : "Paste token"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
            Query ID
          </span>
          <input
            className={inputClass}
            type="text"
            placeholder="e.g. 123456"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
          >
            <i className="fa-solid fa-floppy-disk text-[11px]" />
            Save credentials
          </button>
          {saveStatus && (
            <span className="text-[12px] text-white/60">{saveStatus}</span>
          )}
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Manual sync */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] tracking-[0.1em] text-white/45 font-medium">
          Manual sync
        </div>
        {lastSync && (
          <div className="text-[12px] text-white/55">
            Last synced{" "}
            <span className="text-white/75">
              {new Date(lastSync).toLocaleString()}
            </span>
            {lastInserted !== null && (
              <>
                {" "}
                · {lastInserted} imported
                {lastSkipped ? `, ${lastSkipped} skipped` : ""}
              </>
            )}
          </div>
        )}
        <div className="text-[11.5px] text-white/40">
          IBKR limits requests to roughly one sync every 15 minutes per query.
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSync}
            disabled={syncDisabled}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
              syncDisabled
                ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                : "bg-indigo-500/15 text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/25 cursor-pointer"
            }`}
          >
            <i
              className={`fa-solid fa-rotate text-[11px] ${syncing ? "animate-spin" : ""}`}
            />
            {syncing
              ? "Syncing…"
              : cooldownActive
                ? `Wait ${cooldownLabel}`
                : "Sync now"}
          </button>
          {syncStatus && (
            <span className="text-[12px] text-white/60">{syncStatus}</span>
          )}
        </div>

        {/* Imported-trades viewer */}
        {(lastInserted ?? 0) > 0 || importedTrades.length > 0 ? (
          <div className="mt-1">
            <button
              type="button"
              onClick={handleToggleImported}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition text-[12px] font-medium cursor-pointer"
            >
              <i
                className={`fa-solid fa-chevron-right text-[9px] transition-transform ${importedOpen ? "rotate-90" : ""}`}
              />
              {importedOpen ? "Hide" : "View"} imported trades
              {lastInserted != null && lastInserted > 0 && (
                <span className="ml-1 text-white/40 tabular-nums">
                  ({lastInserted})
                </span>
              )}
            </button>

            <AnimatePresence initial={false}>
              {importedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3">
                    {importedLoading ? (
                      <div className="text-[12px] text-white/45 px-3 py-4">
                        Loading imported trades…
                      </div>
                    ) : importedError ? (
                      <div className="text-[12px] text-red-300 border border-red-500/25 bg-red-500/10 rounded-xl px-3 py-2">
                        {importedError}
                      </div>
                    ) : importedTrades.length === 0 ? (
                      <div className="text-[12px] text-white/45 border border-dashed border-white/10 rounded-xl px-3 py-4 text-center">
                        Nothing from the last sync remains in the journal.
                      </div>
                    ) : (
                      <>
                        <div className="text-[11px] text-white/45 mb-2 flex items-center justify-between">
                          <span>
                            {importedTrades.length} trade
                            {importedTrades.length === 1 ? "" : "s"} from the
                            last sync
                          </span>
                          {importedTrades.some((t) => t.hasDuplicate) && (
                            <span className="inline-flex items-center gap-1.5 text-amber-300">
                              <i className="fa-solid fa-triangle-exclamation text-[10px]" />
                              {
                                importedTrades.filter((t) => t.hasDuplicate)
                                  .length
                              }{" "}
                              possible duplicate
                              {importedTrades.filter((t) => t.hasDuplicate)
                                .length === 1
                                ? ""
                                : "s"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {importedTrades.map((t) => (
                            <ImportedRow
                              key={t._id}
                              trade={t}
                              deleting={!!deleting[t._id]}
                              onDelete={() => handleDeleteImported(t._id)}
                            />
                          ))}
                        </div>
                        <div className="mt-3 text-[10.5px] text-white/35">
                          Deleting here is final - removes the trade from your
                          journal. Use it to clean up duplicates the dedupe
                          missed.
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ImportedRow({
  trade,
  deleting,
  onDelete,
}: {
  trade: ImportedTrade;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isCall = trade.option === "CALL";
  const net =
    (trade.profitLoss ?? 0) - (trade.fees ?? 0);
  const day = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] transition ${
        trade.hasDuplicate ? "border-amber-500/30" : "border-white/10"
      }`}
    >
      {/* Direction chip */}
      <span
        className={`shrink-0 inline-flex items-center justify-center w-12 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
          isCall
            ? "bg-green-500/10 text-green-300 border-green-500/25"
            : "bg-red-500/10 text-red-300 border-red-500/25"
        }`}
      >
        {trade.option}
      </span>

      {/* Symbol + strike */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13.5px] font-semibold text-white truncate">
            {trade.symbol}
          </span>
          <span className="text-[11.5px] text-white/45 tabular-nums">
            {trade.strike} × {trade.qty}
          </span>
          {trade.hasDuplicate && (
            <span
              title="Another trade with the same symbol, strike, qty, option and day already exists."
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9.5px] font-medium tracking-wide"
            >
              <i className="fa-solid fa-triangle-exclamation text-[8px]" />
              Possible dup
            </span>
          )}
        </div>
        <div className="text-[10.5px] text-white/40 tabular-nums">
          {day(trade.dateBought)}
          {trade.dateClosed ? ` › ${day(trade.dateClosed)}` : " · open"}
        </div>
      </div>

      {/* P/L */}
      <div className="shrink-0 text-right">
        <div
          className={`text-[13px] font-semibold tabular-nums ${
            trade.status === "OPEN"
              ? "text-white/50"
              : net >= 0
                ? "text-green-300"
                : "text-red-300"
          }`}
        >
          {trade.status === "OPEN"
            ? "—"
            : `${net >= 0 ? "+" : "−"}$${Math.abs(net).toFixed(2)}`}
        </div>
        {trade.fees ? (
          <div className="text-[9.5px] text-white/35 tabular-nums">
            fees ${trade.fees.toFixed(2)}
          </div>
        ) : null}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label="Delete trade"
        title="Delete this imported trade"
        className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition ${
          deleting
            ? "border-white/10 bg-white/[0.02] text-white/30 cursor-not-allowed"
            : "border-white/10 bg-white/[0.03] text-white/55 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 cursor-pointer"
        }`}
      >
        <i
          className={`fa-solid ${deleting ? "fa-circle-notch animate-spin" : "fa-trash-can"} text-[11px]`}
        />
      </button>
    </div>
  );
}
