"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

type ImportedTrade = {
  _id: string;
  symbol: string;
  option: "CALL" | "PUT";
  strike: number;
  qty: number;
  dateBought: string;
  dateClosed?: string | null;
  profitLoss?: number | null;
  fees?: number | null;
  status: "WIN" | "LOSS" | "OPEN";
  hasDuplicate?: boolean;
};

// Modal that lists the trades inserted by the most recent IBKR sync,
// flags rows that look like duplicates of existing trades (same natural
// key), and lets the user delete any of them. Auto-opens from the
// trades page after a sync inserts at least one row.
export default function ImportedTradesModal({
  onClose,
  onDeleted,
}: {
  onClose: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [trades, setTrades] = useState<ImportedTrade[] | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/ibkr/last-imported");
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        setTrades(d.trades ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        setTrades([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDelete = async (id: string) => {
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      const r = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      setTrades((ts) => (ts ?? []).filter((t) => t._id !== id));
      onDeleted?.(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    }
  };

  const dupCount = (trades ?? []).filter((t) => t.hasDuplicate).length;

  return (
    <AnimatePresence>
      <motion.div
        key="imported-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4"
      >
        <motion.div
          key="imported-card"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_24px_80px_var(--shadow)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="relative px-5 md:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-300 flex items-center justify-center">
                <i className="fa-solid fa-arrows-rotate text-[13px]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium">
                  IBKR Sync
                </div>
                <div className="text-[15px] md:text-base font-semibold tracking-tight">
                  <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                    Imported trades
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-[13px]" />
            </button>
          </div>

          {/* Summary line */}
          <div className="px-5 md:px-6 py-3 border-b border-white/10 text-[11.5px] flex items-center justify-between gap-3 shrink-0">
            <span className="text-white/55 tabular-nums">
              {trades === null
                ? "Loading…"
                : `${trades.length} trade${trades.length === 1 ? "" : "s"} from the last sync`}
            </span>
            {dupCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <i className="fa-solid fa-triangle-exclamation text-[10px]" />
                {dupCount} possible duplicate{dupCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-5 md:px-6 py-3">
            {error && (
              <div className="text-[12px] text-red-300 border border-red-500/25 bg-red-500/10 rounded-xl px-3 py-2 mb-3">
                {error}
              </div>
            )}

            {trades === null ? (
              <div className="text-[12px] text-white/45 px-3 py-6 text-center">
                Loading imported trades…
              </div>
            ) : trades.length === 0 ? (
              <div className="text-[12px] text-white/45 border border-dashed border-white/10 rounded-xl px-3 py-8 text-center">
                Nothing from the last sync remains in your journal.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {trades.map((t) => (
                  <ImportedRow
                    key={t._id}
                    trade={t}
                    deleting={!!deleting[t._id]}
                    onDelete={() => handleDelete(t._id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 md:px-6 py-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[10.5px] text-white/35">
              Deleting here is final - removes the trade from your journal.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
  const net = (trade.profitLoss ?? 0) - (trade.fees ?? 0);
  const day = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] transition ${
        trade.hasDuplicate ? "border-amber-500/30" : "border-white/10"
      }`}
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
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-[13.5px] font-semibold text-white truncate">
            {trade.symbol}
          </span>
          <span className="text-[11.5px] text-white/45 tabular-nums">
            {trade.strike} × {trade.qty}
          </span>
          {trade.hasDuplicate && (
            <span
              title="Another trade with the same symbol, strike, qty, option and day already exists."
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9.5px] font-medium uppercase tracking-wide"
            >
              <i className="fa-solid fa-triangle-exclamation text-[8px]" />
              Possible dup
            </span>
          )}
        </div>
        <div className="text-[10.5px] text-white/40 tabular-nums">
          {day(trade.dateBought)}
          {trade.dateClosed ? ` → ${day(trade.dateClosed)}` : " · open"}
        </div>
      </div>

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
