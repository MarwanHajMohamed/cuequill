"use client";
import React, { useEffect, useMemo, useState } from "react";

const COOLDOWN_MS = 15 * 60 * 1000;

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
    setSaveStatus("Saving...");
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
    setSyncStatus("Syncing with IBKR...");

    const res = await fetch("/api/ibkr/sync", { method: "POST" });
    const data = await res.json();

    setSyncing(false);
    if (res.ok) {
      setSyncStatus(`Done — ${data.inserted} trade${data.inserted !== 1 ? "s" : ""} imported`);
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
    <div className="md:p-7 p-5">
      <div className="md:text-lg text-base flex items-center gap-2">
        <i className="fa-solid fa-chevron-right"></i>
        <div>Auto-sync from IBKR</div>
      </div>

      <div className="pt-5 text-sm md:text-base">
        Trades are automatically imported every weekday at 10 PM UTC. You can also sync manually at any time.
      </div>

      {/* Setup instructions */}
      <div className="mt-5 md:text-base text-sm">
        <div className="font-medium mb-2">Setup</div>
        <ol className="list-decimal pl-6 space-y-1 text-white/70">
          <li>
            In IBKR Account Management go to{" "}
            <span className="text-white">Settings &rarr; User Settings &rarr; Reporting &rarr; Flex Web Service</span>{" "}
            and generate a token.
          </li>
          <li>
            Go to <span className="text-white">Reports &rarr; Flex Queries</span> and create a new{" "}
            <span className="text-white">Activity Flex Query</span>.
          </li>
          <li>
            Under <span className="text-white">Trades</span>, select: Symbol, Strike, Date/Time, Expiry, Put/Call,
            Quantity, Buy/Sell, TradePrice, Realized P/L, TradeID.
          </li>
          <li>
            Set <span className="text-white">Period</span> to{" "}
            <span className="text-white">Last Business Day</span> and{" "}
            <span className="text-white">Format</span> to <span className="text-white">CSV</span>.
          </li>
          <li>Save the query and note the numeric Query ID shown next to it.</li>
        </ol>
      </div>

      {/* Credentials */}
      <div className="mt-7 flex flex-col gap-4 max-w-sm">
        <div className="flex flex-col gap-1">
          <div className="text-sm">
            Flex Web Service Token{" "}
            {hasToken && <span className="text-green-400 text-xs">(saved)</span>}
          </div>
          <input
            className="border border-[#262628] p-1 px-2 rounded-md hover:border-white text-sm bg-transparent"
            type="password"
            placeholder={hasToken ? "Enter new token to replace" : "Paste token"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-sm">Query ID</div>
          <input
            className="border border-[#262628] p-1 px-2 rounded-md hover:border-white text-sm bg-transparent"
            type="text"
            placeholder="e.g. 123456"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="text-xs md:text-sm p-2 px-4 bg-[#16151B] border border-white/20 rounded-xl transition duration-100 cursor-pointer hover:border-white/100"
          >
            Save credentials
          </button>
          {saveStatus && <span className="text-xs text-white/60">{saveStatus}</span>}
        </div>
      </div>

      {/* Manual sync */}
      <div className="mt-7 flex flex-col gap-3">
        <div className="font-medium text-sm md:text-base">Manual sync</div>
        {lastSync && (
          <div className="text-xs text-white/50">
            Last synced: {new Date(lastSync).toLocaleString()}
            {lastInserted !== null && (
              <>
                {" "}— {lastInserted} imported
                {lastSkipped ? `, ${lastSkipped} skipped` : ""}
              </>
            )}
          </div>
        )}
        <div className="text-xs text-white/40">
          IBKR limits requests to roughly one sync every 15 minutes per query.
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSync}
            disabled={syncDisabled}
            className={`text-xs md:text-sm p-2 px-4 border border-white/20 rounded-xl transition duration-100
              ${
                syncDisabled
                  ? "text-white/30 cursor-not-allowed bg-[#16151B]"
                  : "bg-[#182A13] cursor-pointer hover:border-white/100"
              }`}
          >
            {syncing
              ? "Syncing..."
              : cooldownActive
                ? `Wait ${cooldownLabel}`
                : "Sync now"}
          </button>
          {syncStatus && <span className="text-xs text-white/60">{syncStatus}</span>}
        </div>
      </div>
    </div>
  );
}
