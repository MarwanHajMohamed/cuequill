"use client";
import React, { useEffect, useMemo, useState } from "react";

const COOLDOWN_MS = 15 * 60 * 1000;

const inputClass =
  "w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none transition";

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
    } else {
      setSyncStatus(`Error: ${data.error}`);
    }
  };

  const cooldownActive = cooldownMsLeft > 0;
  const syncDisabled = syncing || !hasToken || !queryId || cooldownActive;

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      {/* Intro */}
      <section className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium">
          Auto-sync
        </div>
        <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
          Trades import automatically every weekday at 10 PM UTC. You can also
          trigger a sync manually below.
        </p>
      </section>

      {/* Setup steps */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
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
              TradePrice, Realized P/L, TradeID.
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
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
          Credentials
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/45 font-medium flex items-center gap-2">
            Flex Web Service Token
            {hasToken && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/25 text-[10px] tracking-normal normal-case font-medium">
                <i className="fa-solid fa-check text-[8px]" /> saved
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
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/45 font-medium">
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
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
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
      </section>
    </div>
  );
}
