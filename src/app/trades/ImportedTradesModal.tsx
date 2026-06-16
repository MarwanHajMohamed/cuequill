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

// Lists the trades inserted by the most recent IBKR sync, flags rows that
// look like duplicates of existing trades, and lets the user delete any of
// them. Auto-opens from the trades page after a sync inserts a row.
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

  const count = trades?.length ?? 0;
  const dupCount = (trades ?? []).filter((t) => t.hasDuplicate).length;

  const subtitle =
    trades === null
      ? "Loading…"
      : `${count} trade${count === 1 ? "" : "s"} from the last sync`;

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
          <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-tight">
                Imported trades
              </h2>
              <p className="text-[12px] mt-0.5">
                <span className="text-white/45">{subtitle}</span>
                {dupCount > 0 && (
                  <span className="text-amber-400">
                    {" · "}
                    {dupCount} possible duplicate{dupCount === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-[13px]" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {error && (
              <div className="text-[12px] text-red-300 border border-red-500/25 bg-red-500/10 rounded-xl px-3 py-2 mb-2 mx-2">
                {error}
              </div>
            )}

            {trades === null ? (
              <div className="text-[12px] text-white/40 px-3 py-10 text-center">
                Loading…
              </div>
            ) : count === 0 ? (
              <div className="text-[12px] text-white/40 px-3 py-10 text-center">
                Nothing from the last sync remains.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
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
  const isOpen = trade.status === "OPEN";
  const net = (trade.profitLoss ?? 0) - (trade.fees ?? 0);
  const day = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition">
      <span
        className={`shrink-0 w-11 text-center text-[10px] font-semibold uppercase tracking-wide py-1 rounded-md ${
          isCall ? "bg-green-500/12 text-green-300" : "bg-red-500/12 text-red-300"
        }`}
      >
        {trade.option}
      </span>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] font-semibold text-white truncate">
            {trade.symbol}
          </span>
          <span className="text-[12px] text-white/45 tabular-nums shrink-0">
            {trade.strike} × {trade.qty}
          </span>
          {trade.hasDuplicate && (
            <i
              title="Looks like a duplicate of a trade already in your journal."
              className="fa-solid fa-triangle-exclamation text-amber-400/80 text-[10px] shrink-0"
            />
          )}
        </div>
        <div className="text-[11px] text-white/40 tabular-nums">
          {day(trade.dateBought)}
          {trade.dateClosed ? ` → ${day(trade.dateClosed)}` : " · open"}
        </div>
      </div>

      <div
        className={`shrink-0 text-[13.5px] font-semibold tabular-nums ${
          isOpen ? "text-white/40" : net >= 0 ? "text-green-300" : "text-red-300"
        }`}
      >
        {isOpen ? "—" : `${net >= 0 ? "+" : "−"}$${Math.abs(net).toFixed(2)}`}
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label="Delete trade"
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/35 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i
          className={`fa-solid ${deleting ? "fa-circle-notch animate-spin" : "fa-trash-can"} text-[11px]`}
        />
      </button>
    </div>
  );
}
