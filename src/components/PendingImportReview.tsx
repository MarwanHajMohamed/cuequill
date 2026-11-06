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
// (duplicate-looking) ones. Each row can be imported on its own (the Import
// button overlays its P/L on hover), and each section can be imported in
// bulk. Fetches the pending stash itself; `reloadToken` forces a refetch
// (bump it after a sync), and `onChanged` fires after any import/discard.
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

  const importBulk = async (kind: "new" | "skipped", keys: string[]) => {
    setBulk(kind);
    await importKeys(keys);
    setBulk(null);
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
            <BulkButton
              tone="teal"
              busy={bulk === "new"}
              disabled={anyBusy}
              label="Import all"
              busyLabel="Importing…"
              onClick={() =>
                importBulk(
                  "new",
                  newTrades.map((t) => t._key),
                )
              }
            />
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
            <div className="text-[11px] tracking-[0.1em] text-amber-400/80 font-medium">
              Skipped · {skipped.length}
            </div>
            <BulkButton
              tone="plain"
              busy={bulk === "skipped"}
              disabled={anyBusy}
              label="Import anyway"
              busyLabel="Importing…"
              onClick={() =>
                importBulk(
                  "skipped",
                  skipped.map((t) => t._key),
                )
              }
            />
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

      <div>
        <button
          type="button"
          onClick={discardAll}
          disabled={anyBusy}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white transition text-[12px] font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {bulk === "discard" ? "Discarding…" : "Discard all"}
        </button>
      </div>
    </div>
  );
}

function BulkButton({
  tone,
  busy,
  disabled,
  label,
  busyLabel,
  onClick,
}: {
  tone: "teal" | "plain";
  busy: boolean;
  disabled: boolean;
  label: string;
  busyLabel: string;
  onClick: () => void;
}) {
  const styles =
    tone === "teal"
      ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25"
      : "bg-white/[0.04] text-white/70 border-white/15 hover:bg-white/[0.08] hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full border text-[11.5px] font-medium transition cursor-pointer disabled:opacity-50 whitespace-nowrap ${styles}`}
    >
      {busy ? busyLabel : label}
    </button>
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

      {/* P/L with the per-trade Import button overlaid. On hover (desktop) the
          P/L fades and Import takes its place - no layout shift. On touch,
          which has no hover, Import shows in its place instead. */}
      <div className="relative shrink-0 min-w-[92px] h-7 flex items-center justify-end">
        <span
          className={`text-[13px] font-semibold tabular-nums transition-opacity group-hover:opacity-0 [@media(hover:none)]:opacity-0 ${
            isOpen
              ? "text-white/50"
              : net >= 0
                ? "text-green-300"
                : "text-red-300"
          }`}
        >
          {isOpen ? "-" : `${net >= 0 ? "+" : "−"}$${Math.abs(net).toFixed(2)}`}
        </span>
        <button
          type="button"
          onClick={onImport}
          disabled={busy}
          aria-label="Import this trade"
          className="absolute inset-y-0 right-0 inline-flex items-center px-3 rounded-full text-[11.5px] font-medium bg-teal-500/15 text-teal-200 border border-teal-500/25 hover:bg-teal-500/25 transition cursor-pointer disabled:opacity-50 whitespace-nowrap opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}
