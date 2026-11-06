"use client";

import React, { useCallback, useEffect, useState } from "react";

// A trade staged by a sync but not yet imported. `_skipped` marks the ones
// the dedupe flagged as likely duplicates (kept out by default, importable
// if the user insists).
export type PendingTrade = {
  _key: string;
  _skipped: boolean;
  symbol: string;
  option: "CALL" | "PUT";
  strike: number;
  qty: number;
  dateBought: string;
  dateClosed?: string | null;
  profitLoss?: number | null;
  fees?: number | null;
  status: "WIN" | "LOSS" | "OPEN";
};

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "-";

// Review of what a sync found, split into new trades and skipped
// (duplicate-looking) ones. Each row can be imported on its own (hover
// button), and each section can be imported in bulk. Fetches the pending
// stash itself; `reloadToken` forces a refetch (bump it after a sync), and
// `onChanged` fires after any import/discard so the parent can refresh.
export default function PendingImportReview({
  reloadToken = 0,
  onChanged,
}: {
  reloadToken?: number;
  onChanged?: () => void;
}) {
  const [pending, setPending] = useState<PendingTrade[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<"new" | "skipped" | "discard" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/ibkr/sync/pending");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to load");
      setPending(d.trades ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setPending([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const importKeys = async (keys: string[]) => {
    setError("");
    setBusy((b) => new Set([...b, ...keys]));
    try {
      const r = await fetch("/api/ibkr/sync/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Import failed");
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    }
  };

  const discardAll = async () => {
    setError("");
    setBulk("discard");
    try {
      await fetch("/api/ibkr/sync/pending", { method: "DELETE" });
      await load();
      onChanged?.();
    } catch {
      /* best-effort */
    } finally {
      setBulk(null);
    }
  };

  if (pending === null || pending.length === 0) {
    return error ? (
      <div className="text-[12px] text-red-300 border border-red-500/25 bg-red-500/10 rounded-xl px-3 py-2">
        {error}
      </div>
    ) : null;
  }

  const newTrades = pending.filter((p) => !p._skipped);
  const skipped = pending.filter((p) => p._skipped);
  const anyBusy = busy.size > 0 || bulk !== null;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="text-[12px] text-red-300 border border-red-500/25 bg-red-500/10 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {newTrades.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] tracking-[0.1em] text-teal-400/80 font-medium">
              New · {newTrades.length}
            </div>
            <button
              type="button"
              disabled={anyBusy}
              onClick={() => {
                setBulk("new");
                importKeys(newTrades.map((t) => t._key)).finally(() =>
                  setBulk(null),
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-medium bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition cursor-pointer disabled:opacity-50"
            >
              <i
                className={`fa-solid ${bulk === "new" ? "fa-circle-notch animate-spin" : "fa-check"} text-[10px]`}
              />
              Import all
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {newTrades.map((t) => (
              <PendingRow
                key={t._key}
                trade={t}
                busy={busy.has(t._key)}
                onImport={() => importKeys([t._key])}
              />
            ))}
          </div>
        </section>
      )}

      {skipped.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-amber-400/80 font-medium">
              <i className="fa-solid fa-triangle-exclamation text-[10px]" />
              Skipped · {skipped.length}
            </div>
            <button
              type="button"
              disabled={anyBusy}
              onClick={() => {
                setBulk("skipped");
                importKeys(skipped.map((t) => t._key)).finally(() =>
                  setBulk(null),
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-medium bg-white/[0.04] text-white/70 border border-white/15 hover:bg-white/[0.08] hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <i
                className={`fa-solid ${bulk === "skipped" ? "fa-circle-notch animate-spin" : "fa-arrow-up-from-bracket"} text-[10px]`}
              />
              Import anyway
            </button>
          </div>
          <div className="text-[11px] text-white/40 leading-relaxed">
            These look like duplicates of trades already in your journal, so
            they&apos;re kept out. Import any you actually want.
          </div>
          <div className="flex flex-col gap-1.5">
            {skipped.map((t) => (
              <PendingRow
                key={t._key}
                trade={t}
                skipped
                busy={busy.has(t._key)}
                onImport={() => importKeys([t._key])}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={discardAll}
          disabled={anyBusy}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white transition text-[12px] font-medium cursor-pointer disabled:opacity-50"
        >
          <i
            className={`fa-solid ${bulk === "discard" ? "fa-circle-notch animate-spin" : "fa-xmark"} text-[11px]`}
          />
          Discard all
        </button>
        <span className="text-[11px] text-white/35">
          Anything you don&apos;t import stays saved for next time.
        </span>
      </div>
    </div>
  );
}

function PendingRow({
  trade,
  skipped = false,
  busy,
  onImport,
}: {
  trade: PendingTrade;
  skipped?: boolean;
  busy: boolean;
  onImport: () => void;
}) {
  const isCall = trade.option === "CALL";
  const isOpen = trade.status === "OPEN";
  const net = (trade.profitLoss ?? 0) - (trade.fees ?? 0);

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl border bg-white/[0.02] transition ${
        skipped ? "border-amber-500/20" : "border-white/10"
      } hover:bg-white/[0.04]`}
    >
      <span
        className={`shrink-0 inline-flex items-center justify-center w-12 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
          isCall
            ? "bg-green-500/10 text-green-300 border-green-500/25"
            : "bg-red-500/10 text-red-300 border-red-500/25"
        }`}
      >
        {trade.option}
      </span>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13.5px] font-semibold text-white truncate">
            {trade.symbol}
          </span>
          <span className="text-[11.5px] text-white/45 tabular-nums">
            {trade.strike} × {trade.qty}
          </span>
        </div>
        <div className="text-[10.5px] text-white/40 tabular-nums">
          {day(trade.dateBought)}
          {trade.dateClosed ? ` › ${day(trade.dateClosed)}` : " · open"}
        </div>
      </div>

      <div
        className={`shrink-0 text-right text-[13px] font-semibold tabular-nums ${
          isOpen ? "text-white/50" : net >= 0 ? "text-green-300" : "text-red-300"
        }`}
      >
        {isOpen ? "-" : `${net >= 0 ? "+" : "−"}$${Math.abs(net).toFixed(2)}`}
      </div>

      {/* Per-trade import. Hidden until hover on desktop; always shown on
          touch (no hover there). */}
      <button
        type="button"
        onClick={onImport}
        disabled={busy}
        aria-label="Import this trade"
        title="Import this trade"
        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal-500/15 text-teal-200 border border-teal-500/25 hover:bg-teal-500/25 transition cursor-pointer disabled:opacity-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
      >
        <i
          className={`fa-solid ${busy ? "fa-circle-notch animate-spin" : "fa-plus"} text-[10px]`}
        />
        Import
      </button>
    </div>
  );
}
