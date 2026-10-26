"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useIsPro } from "@/hooks/useIsPro";
import { useScrollLock } from "@/hooks/useScrollLock";

const COOLDOWN_MS = 30 * 60 * 1000;

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

export default function IBKRTab({ embedded = false }: { embedded?: boolean }) {
  const { isPro } = useIsPro();
  const queryClient = useQueryClient();

  // A sync adds trades server-side (new rows, with commissions/fees). The
  // trades table is a cached React Query, so refresh it - otherwise net P/L
  // keeps showing stale numbers until something else invalidates the cache.
  const refreshTradeData = () => {
    queryClient.invalidateQueries({ queryKey: ["trades"] });
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
  };
  const [token, setToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [confirmQueryId, setConfirmQueryId] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastManualSync, setLastManualSync] = useState<string | null>(null);
  const [lastInserted, setLastInserted] = useState<number | null>(null);
  const [lastSkipped, setLastSkipped] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Setup-screenshot lightbox (click to enlarge, then click to zoom in).
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  // Last-imported viewer state
  const [importedOpen, setImportedOpen] = useState(false);
  const [importedLoading, setImportedLoading] = useState(false);
  const [importedTrades, setImportedTrades] = useState<ImportedTrade[]>([]);
  const [importedError, setImportedError] = useState("");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  // Distinguishes "haven't tried loading yet" from "loaded, list is
  // empty". Without this the pill count would flash the historical
  // ibkrLastSyncInserted number before the real list arrives.
  const [haveLoadedImported, setHaveLoadedImported] = useState(false);

  useEffect(() => {
    fetch("/api/user/ibkr-settings")
      .then((r) => r.json())
      .then((data) => {
        setQueryId(data.ibkrQueryId ?? "");
        setConfirmQueryId(data.ibkrTradeConfirmQueryId ?? "");
        setHasToken(data.hasToken ?? false);
        setLastSync(data.ibkrLastSync ?? null);
        setLastManualSync(data.ibkrLastManualSync ?? null);
        setLastInserted(data.ibkrLastSyncInserted ?? null);
        setLastSkipped(data.ibkrLastSyncSkipped ?? null);
      });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cooldownMsLeft = useMemo(() => {
    if (!lastManualSync) return 0;
    const elapsed = now - new Date(lastManualSync).getTime();
    return Math.max(0, COOLDOWN_MS - elapsed);
  }, [lastManualSync, now]);

  const cooldownLabel = useMemo(() => {
    if (cooldownMsLeft <= 0) return "";
    const total = Math.ceil(cooldownMsLeft / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [cooldownMsLeft]);

  const handleSave = async () => {
    setSaveStatus("Saving…");
    const body: Record<string, string> = {
      ibkrQueryId: queryId,
      ibkrTradeConfirmQueryId: confirmQueryId,
    };
    if (token) body.ibkrToken = token;

    const res = await fetch("/api/user/ibkr-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSaveStatus("Saved");
      const willHaveToken = hasToken || !!token;
      if (token) {
        setHasToken(true);
        setToken("");
      }
      // Like TradeZella: once connected (token + at least one query), pull
      // history right away instead of making the user click "Sync now".
      if (willHaveToken && (queryId || confirmQueryId)) {
        handleSync();
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
      const nowIso = new Date().toISOString();
      setLastSync(nowIso);
      setLastManualSync(nowIso);
      setLastInserted(data.inserted);
      // Force a re-fetch of the live imported list after a fresh
      // sync so the pill count reflects the new set, not whatever
      // was left over from the previous sync.
      setImportedTrades([]);
      setHaveLoadedImported(false);
      setLastSkipped(data.skipped);
      // Newly imported trades (and their fees) need to reach the table.
      refreshTradeData();
      // If a panel was open, refresh; otherwise let user open it.
      if (importedOpen) loadImported();
    } else if (res.status === 429) {
      // Server-side 30-min limit. Sync the local cooldown to the server's
      // remaining time so the button countdown matches.
      if (typeof data.retryAfterMs === "number") {
        setLastManualSync(
          new Date(Date.now() - (COOLDOWN_MS - data.retryAfterMs)).toISOString(),
        );
      }
      setSyncStatus(data.error ?? "Please wait before resyncing.");
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
      setHaveLoadedImported(true);
    }
  };

  // Fetch the live imported-trades list once we know a sync has ever
  // inserted rows. This is what makes the pill count and the
  // expander agree - using the historical ibkrLastSyncInserted alone
  // would show a count for docs that have since been deleted or
  // merged.
  useEffect(() => {
    if (lastInserted != null && lastInserted > 0 && !haveLoadedImported) {
      loadImported();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInserted]);

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

  // Undo the entire last sync (delete every trade it inserted). Used to
  // roll back an import that slipped duplicates past the dedupe.
  const [undoing, setUndoing] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const handleUndoImport = async () => {
    setUndoing(true);
    setImportedError("");
    try {
      const r = await fetch("/api/ibkr/last-imported", { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Undo failed");
      setImportedTrades([]);
      setHaveLoadedImported(true);
      setLastInserted(0);
      setLastSkipped(0);
      setConfirmUndo(false);
      // The removed trades need to leave the table / net P/L too.
      refreshTradeData();
      setSyncStatus(
        `Removed ${d.deleted} imported trade${d.deleted !== 1 ? "s" : ""} from the last sync.`,
      );
    } catch (e) {
      setImportedError(e instanceof Error ? e.message : "Undo failed");
    } finally {
      setUndoing(false);
    }
  };

  const cooldownActive = cooldownMsLeft > 0;
  const syncDisabled =
    syncing || !hasToken || (!queryId && !confirmQueryId) || cooldownActive;

  return (
    <div
      className={`flex flex-col gap-6 ${embedded ? "" : "p-5 md:p-7"}`}
    >
      {/* Intro */}
      <section className="flex flex-col gap-2">
        <div className="text-[11px] tracking-[0.1em] text-teal-400/80 font-medium flex items-center gap-2">
          Auto-sync
          {!isPro && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[9.5px] tracking-[0.1em] font-semibold uppercase">
              <i className="fa-solid fa-lock text-[8px]" /> Pro
            </span>
          )}
        </div>
        {isPro ? (
          <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
            Trades import automatically: a same-day sync runs every hour during
            market hours (when you add a Trade Confirmation query below), plus a
            full settled sync each night. You can also trigger a sync manually
            below.
          </p>
        ) : (
          <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
            Morning auto-sync is a Pro feature. You can still import manually
            below as often as you like.{" "}
            <Link
              href="/pricing"
              className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
            >
              Upgrade to Pro
            </Link>
            .
          </p>
        )}
      </section>

      {/* Setup steps */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] tracking-[0.1em] text-white/45 font-medium">
          Setup
        </div>
        <ol className="flex flex-col gap-5 text-[13px] text-white/75 leading-relaxed">
          {(
            [
              {
                text: (
                  <>
                    In IBKR, open{" "}
                    <span className="text-white">
                      Performance &amp; Reports &rsaquo; Flex Queries
                    </span>
                    . First enable the{" "}
                    <span className="text-white">Flex Web Service</span> and
                    generate a token - set the{" "}
                    <span className="text-white">activation period to 1 year</span>{" "}
                    so it doesn&apos;t expire and break the sync.
                  </>
                ),
                img: "/ibkr/1-flex-queries.webp",
                alt: "IBKR Performance & Reports menu with Flex Queries selected",
              },
              {
                text: (
                  <>
                    In the{" "}
                    <span className="text-white">Activity Flex Query</span> panel,
                    click the <span className="text-white">+</span> (Create).
                  </>
                ),
                img: "/ibkr/2-create-activity.webp",
                alt: "Create button on the Activity Flex Query panel",
              },
              {
                text: (
                  <>
                    Give it a{" "}
                    <span className="text-white">Query Name</span> (anything, e.g.
                    &ldquo;Cuequill&rdquo;).
                  </>
                ),
                img: "/ibkr/3-query-name.webp",
                alt: "Query Name field filled in with Cuequill",
              },
              {
                text: (
                  <>
                    Scroll the <span className="text-white">Sections</span> list
                    and open <span className="text-white">Trades</span>.
                  </>
                ),
                img: "/ibkr/4-trades-section.webp",
                alt: "Trades section in the Flex Query sections list",
              },
              {
                text: (
                  <>
                    In the Trades dialog, choose{" "}
                    <span className="text-white">Execution</span> and tick{" "}
                    <span className="text-white">Select All</span>, then close it.
                  </>
                ),
                img: "/ibkr/5-execution-select-all.webp",
                alt: "Trades dialog with Execution and Select All checked",
              },
              {
                text: (
                  <>
                    Set <span className="text-white">Format</span> to{" "}
                    <span className="text-white">CSV</span> and{" "}
                    <span className="text-white">Period</span> to{" "}
                    <span className="text-white">Last 365 Days</span>, then{" "}
                    <span className="text-white">Save</span>.
                  </>
                ),
                img: "/ibkr/6-csv-period.webp",
                alt: "Activity Flex Query delivery configuration with CSV format and Last 365 Calendar Days period",
              },
              {
                text: (
                  <>
                    Open the query&apos;s{" "}
                    <span className="text-white">info (i)</span> icon to copy the
                    numeric <span className="text-white">Query ID</span>. Paste it
                    and the token into Credentials below and Save.
                  </>
                ),
              },
              {
                text: (
                  <>
                    <span className="text-white">
                      Optional, for same-day imports:
                    </span>{" "}
                    on the Flex Queries page, click the{" "}
                    <span className="text-white">+</span> on the{" "}
                    <span className="text-white">
                      Trade Confirmation Flex Query
                    </span>{" "}
                    panel. It reports trades the day you take them, instead of
                    waiting for the next settled statement.
                  </>
                ),
                img: "/ibkr/tc-1-create.webp",
                alt: "Create button on the Trade Confirmation Flex Query panel",
              },
              {
                text: (
                  <>
                    In the Trade Confirmation dialog, choose{" "}
                    <span className="text-white">Execution</span> and tick{" "}
                    <span className="text-white">Select All</span>, then close it.
                  </>
                ),
                img: "/ibkr/tc-2-execution.webp",
                alt: "Trade Confirmation dialog with Execution and Select All checked",
              },
              {
                text: (
                  <>
                    Set <span className="text-white">Format</span> to{" "}
                    <span className="text-white">CSV</span> and{" "}
                    <span className="text-white">Period</span> to{" "}
                    <span className="text-white">Today</span>, then{" "}
                    <span className="text-white">Save</span>. Copy its Query ID
                    into the Trade Confirmation Query ID field below.
                  </>
                ),
                img: "/ibkr/tc-3-csv-today.webp",
                alt: "Trade Confirmation delivery configuration with CSV format and Today period",
              },
            ] as {
              text: React.ReactNode;
              img?: string;
              alt?: string;
              placeholder?: boolean;
            }[]
          ).map((step, i) => (
            <li key={i} className="flex flex-col gap-2.5">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[11px] tabular-nums text-white/55 font-semibold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step.text}</span>
              </div>
              {(step.img || step.placeholder) &&
                (step.img ? (
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({ src: step.img!, alt: step.alt ?? "" })
                    }
                    aria-label="Enlarge screenshot"
                    className="ml-9 max-w-2xl rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] cursor-zoom-in block hover:border-white/25 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.img}
                      alt={step.alt ?? ""}
                      loading="lazy"
                      className="w-full h-auto block"
                    />
                  </button>
                ) : (
                  <div className="ml-9 max-w-2xl rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
                    <div className="aspect-[16/9] flex items-center justify-center text-[11.5px] text-white/35 text-center px-4">
                      Screenshot coming soon
                    </div>
                  </div>
                ))}
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

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium flex items-center gap-2">
            Trade Confirmation Query ID
            <span className="text-white/35 tracking-normal normal-case font-normal">
              optional - same-day
            </span>
          </span>
          <input
            className={inputClass}
            type="text"
            placeholder="e.g. 654321"
            value={confirmQueryId}
            onChange={(e) => setConfirmQueryId(e.target.value)}
          />
          <span className="text-[11px] text-white/40 leading-relaxed">
            Reports trades the day you take them. The hourly auto-sync and
            manual sync use it to pull same-day fills.
          </span>
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
          Manual syncs are limited to one every 30 minutes.
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

        {/* Imported-trades viewer. Once the live list has loaded we
            use its length for the pill count; before that we fall
            back to the historical ibkrLastSyncInserted so the button
            still appears while the fetch is in flight. Hidden
            entirely once we've confirmed nothing remains - either
            the sync was empty, or the user deleted / merged the
            imports away since. */}
        {(() => {
          const liveCount = importedTrades.length;
          const historicalCount = lastInserted ?? 0;
          const showCount = haveLoadedImported ? liveCount : historicalCount;
          const shouldShow = haveLoadedImported
            ? liveCount > 0
            : historicalCount > 0 || importedLoading;
          if (!shouldShow) return null;
          return (
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
              {showCount > 0 && (
                <span className="ml-1 text-white/40 tabular-nums">
                  ({showCount})
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

                        {/* Undo the whole import - removes exactly the trades
                            this sync added, leaving everything logged before
                            it in place. */}
                        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
                          <div className="text-[12px] text-white/70 leading-relaxed">
                            Added duplicates? Undo this import to delete the{" "}
                            {importedTrades.length} trade
                            {importedTrades.length === 1 ? "" : "s"} it added.
                            Trades you logged before this sync aren&apos;t
                            touched.
                          </div>
                          <div className="flex items-center gap-2">
                            {!confirmUndo ? (
                              <button
                                type="button"
                                onClick={() => setConfirmUndo(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition text-[12.5px] font-medium cursor-pointer"
                              >
                                <i className="fa-solid fa-rotate-left text-[11px]" />
                                Undo this import
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={handleUndoImport}
                                  disabled={undoing}
                                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 text-red-200 hover:bg-red-500/25 transition text-[12.5px] font-medium cursor-pointer disabled:opacity-50"
                                >
                                  <i
                                    className={`fa-solid ${undoing ? "fa-circle-notch animate-spin" : "fa-trash-can"} text-[11px]`}
                                  />
                                  {undoing
                                    ? "Removing…"
                                    : `Yes, remove ${importedTrades.length}`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmUndo(false)}
                                  disabled={undoing}
                                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] transition text-[12.5px] font-medium cursor-pointer disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
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
          );
        })()}
      </section>

      <AnimatePresence>
        {lightbox && (
          <SetupLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Fullscreen viewer for the setup screenshots. Click the backdrop / X (or
// Esc) to close. Click the image to zoom into that spot; click again to
// zoom back out.
function SetupLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useScrollLock();
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const ZOOM = 2.5;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
    setZoomed(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition flex items-center justify-center cursor-pointer z-10"
      >
        <i className="fa-solid fa-xmark text-[14px]" />
      </button>

      {/* Wrapper clips the zoom; sized to the fitted image. */}
      <div
        className="relative overflow-hidden rounded-lg max-w-[95vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={handleImageClick}
          style={{
            transform: zoomed ? `scale(${ZOOM})` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
          className={`block max-w-[95vw] max-h-[90vh] w-auto h-auto select-none transition-transform duration-200 ${
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
          draggable={false}
        />
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center text-[11.5px] text-white/50 pointer-events-none">
        {zoomed ? "Click the image to zoom out" : "Click the image to zoom in"}
      </div>
    </motion.div>
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
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-";

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
            ? "-"
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
