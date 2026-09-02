"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { hapticNotify } from "@/lib/haptics";

type ImportedTrade = {
  _id: string;
  symbol: string;
  option: "CALL" | "PUT";
  strike: number;
  qty: number;
  dateBought: string;
  dateClosed?: string | null;
  expiryDate?: string | null;
  profitLoss?: number | null;
  fees?: number | null;
  status: "WIN" | "LOSS" | "OPEN";
  simulated?: boolean;
  hasDuplicate?: boolean;
};

// Contract-identity key for auto-merge: legs share a symbol, side, strike,
// expiry day, open/closed class, and sim flag - the same rules the merge
// endpoint enforces. Two+ imported legs on one key are partial fills of the
// same order and can be collapsed into a single row.
const dayOf = (iso: string | null | undefined) =>
  iso ? new Date(iso).toISOString().split("T")[0] : "";
function mergeKey(t: ImportedTrade): string {
  const statusClass = t.status === "OPEN" ? "OPEN" : "CLOSED";
  return [
    t.symbol,
    t.option,
    t.strike,
    dayOf(t.expiryDate),
    statusClass,
    t.simulated ? "sim" : "real",
  ].join("|");
}

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
  // True while merging every group at once; a group's key while merging just
  // that one - so each group's own button can show its spinner independently.
  const [mergingAll, setMergingAll] = useState(false);
  const [mergingKey, setMergingKey] = useState<string | null>(null);
  const busy = mergingAll || mergingKey !== null;

  useScrollLock();

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

  useEffect(() => {
    load();
  }, []);

  // Group the imported legs by contract identity; groups of 2+ are the
  // auto-mergeable partial fills.
  const mergeGroups = useMemo(() => {
    const map = new Map<string, ImportedTrade[]>();
    for (const t of trades ?? []) {
      const k = mergeKey(t);
      const arr = map.get(k);
      if (arr) arr.push(t);
      else map.set(k, [t]);
    }
    return Array.from(map.values()).filter((g) => g.length >= 2);
  }, [trades]);

  // ids that belong to some auto-merge group (for the outline + ordering).
  const groupedIds = useMemo(
    () => new Set(mergeGroups.flat().map((t) => t._id)),
    [mergeGroups],
  );

  const mergeableCount = mergeGroups.reduce((s, g) => s + g.length, 0);

  // Merge one set of ids on the server (collapses partial fills into one row).
  const mergeIds = async (ids: string[]) => {
    const r = await fetch("/api/trades/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error ?? "Merge failed");
    }
  };

  // Merge a single group on demand, so multiple detected groups can be
  // collapsed one at a time (and reviewed) rather than all at once.
  const handleMergeGroup = async (group: ImportedTrade[]) => {
    if (busy) return;
    setMergingKey(mergeKey(group[0]));
    setError("");
    try {
      await mergeIds(group.map((t) => t._id));
      hapticNotify("success");
      await load();
      onDeleted?.("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setMergingKey(null);
    }
  };

  // Merge every detected group in one go.
  const handleMergeAll = async () => {
    if (mergeGroups.length === 0 || busy) return;
    setMergingAll(true);
    setError("");
    try {
      for (const group of mergeGroups) {
        await mergeIds(group.map((t) => t._id));
      }
      hapticNotify("success");
      await load();
      onDeleted?.("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setMergingAll(false);
    }
  };

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
          <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[16px] font-semibold tracking-tight">
                  Imported trades
                </h2>
                {/* Hover-only tooltip. `group` on the wrapper + `group-hover`
                    on the popover keeps this stateless - one-liner
                    explanation, no click target, no accessibility trap. */}
                <span className="relative group inline-flex">
                  <i
                    tabIndex={0}
                    className="fa-solid fa-circle-info text-[11px] text-white/40 hover:text-white/70 focus:text-white/70 outline-none transition cursor-pointer"
                    aria-label="What is this?"
                  />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 w-56 rounded-lg border border-white/10 bg-[var(--surface)] shadow-[0_12px_40px_var(--shadow)] px-3 py-2 text-[11.5px] leading-snug text-white/75 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition z-10"
                  >
                    Trades brought in by the last IBKR sync. Review and delete
                    anything that shouldn&apos;t be here.
                  </span>
                </span>
              </div>
              {dupCount > 0 && (
                <p className="text-[12px] mt-0.5 text-amber-400">
                  {dupCount} possible duplicate{dupCount === 1 ? "" : "s"}
                </p>
              )}
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
            ) : trades.length === 0 ? (
              <div className="text-[12px] text-white/40 px-3 py-10 text-center">
                Nothing from the last sync remains.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {/* Auto-mergeable groups - outlined together so the partial
                    fills that will collapse into one row are obvious. */}
                {mergeGroups.map((group, gi) => {
                  const key = mergeKey(group[0]);
                  const thisMerging = mergingKey === key;
                  return (
                  <div
                    key={`grp-${gi}`}
                    className="rounded-xl border border-teal-500/40 bg-teal-500/[0.05] p-1"
                  >
                    <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-0.5">
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-teal-300/90">
                        <i className="fa-solid fa-object-group text-[10px]" />
                        {group.length} fills · same contract
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMergeGroup(group)}
                        disabled={busy}
                        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <i
                          className={`fa-solid ${
                            thisMerging
                              ? "fa-circle-notch animate-spin"
                              : "fa-object-group"
                          } text-[10px]`}
                        />
                        {thisMerging ? "Merging…" : "Merge"}
                      </button>
                    </div>
                    {group.map((t) => (
                      <ImportedRow
                        key={t._id}
                        trade={t}
                        deleting={!!deleting[t._id]}
                        onDelete={() => handleDelete(t._id)}
                      />
                    ))}
                  </div>
                  );
                })}

                {/* Everything else */}
                {trades
                  .filter((t) => !groupedIds.has(t._id))
                  .map((t) => (
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

          {/* Footer - merge every group at once. Individual groups can also
              be merged one at a time from their own Merge button above. Only
              shown when 2+ groups make a bulk action worthwhile. */}
          {mergeGroups.length > 1 && (
            <div className="px-4 py-3 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-white/50">
                {mergeGroups.length} mergeable groups · {mergeableCount} fills
              </span>
              <button
                type="button"
                onClick={handleMergeAll}
                disabled={busy}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i
                  className={`fa-solid ${
                    mergingAll
                      ? "fa-circle-notch animate-spin"
                      : "fa-object-group"
                  } text-[11px]`}
                />
                {mergingAll ? "Merging…" : "Merge all"}
              </button>
            </div>
          )}
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
      : "-";

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
          {trade.dateClosed ? ` › ${day(trade.dateClosed)}` : " · open"}
        </div>
      </div>

      <div
        className={`shrink-0 text-[13.5px] font-semibold tabular-nums ${
          isOpen ? "text-white/40" : net >= 0 ? "text-green-300" : "text-red-300"
        }`}
      >
        {isOpen ? "-" : `${net >= 0 ? "+" : "−"}$${Math.abs(net).toFixed(2)}`}
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
