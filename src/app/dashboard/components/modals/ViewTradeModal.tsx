"use client";

import { Trade } from "@/app/types/Trades";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";
import { useScrollLock } from "@/hooks/useScrollLock";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { format } from "date-fns";
import { motion } from "framer-motion";
import React, { useEffect } from "react";

type TradeModalProps = {
  onClose: () => void;
  initialTrade: Partial<Trade>;
  /** Hide the Edit button if not provided (read-only contexts like dashboard). */
  onEdit?: () => void;
};

const safeDate = (d: string | Date | null | undefined) => {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export default function ViewTradeModal({
  onClose,
  initialTrade,
  onEdit,
}: TradeModalProps) {
  useScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isOpen = initialTrade.status === "OPEN";
  const isWin = initialTrade.status === "WIN";
  const isLoss = initialTrade.status === "LOSS";
  const isClosed = isWin || isLoss;
  const isCall = initialTrade.option === "CALL";

  const netPL = tradeNetPL(initialTrade as Trade);
  const gross = initialTrade.profitLoss ?? 0;
  const fees = initialTrade.fees ?? 0;

  const bought = safeDate(initialTrade.dateBought);
  const closed = safeDate(initialTrade.dateClosed);
  const expiry = safeDate(initialTrade.expiryDate);

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 md:p-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col bg-[#0F0F17] border border-white/10 rounded-2xl md:w-[90%] md:max-w-md w-full max-h-full md:max-h-[90vh] overflow-hidden"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* ── Hero header (fixed) ── */}
        <div
          className={`relative shrink-0 px-5 md:px-6 pt-5 md:pt-6 pb-5 md:pb-6 border-b border-white/5 ${
            isWin
              ? "bg-gradient-to-br from-green-500/15 via-transparent to-transparent"
              : isLoss
                ? "bg-gradient-to-br from-red-500/15 via-transparent to-transparent"
                : "bg-gradient-to-br from-orange-500/10 via-transparent to-transparent"
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>

          <div className="flex items-center gap-2 flex-wrap pr-10">
            <span className="text-xl md:text-2xl font-bold tracking-tight">
              {initialTrade.symbol}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isCall
                  ? "bg-green-500/15 text-green-500"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {initialTrade.option}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isWin
                  ? "bg-green-500/15 text-green-500"
                  : isLoss
                    ? "bg-red-500/15 text-red-500"
                    : "bg-orange-500/15 text-orange-400"
              }`}
            >
              {initialTrade.status}
            </span>
            {initialTrade.simulated && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                Sim
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            {isClosed ? (
              <>
                <span
                  className={`text-3xl md:text-4xl font-bold tabular-nums ${
                    netPL >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {netPL >= 0 ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
                </span>
                <span className="text-xs text-white/40">net</span>
              </>
            ) : (
              <span className="text-2xl md:text-3xl font-bold text-orange-400">
                Open position
              </span>
            )}
          </div>

          {isClosed && (gross !== netPL || fees > 0) && (
            <div className="mt-1.5 text-[11px] text-white/40 flex gap-3 flex-wrap">
              <span>Gross ${gross.toFixed(2)}</span>
              {fees > 0 && <span>Fees −${fees.toFixed(2)}</span>}
            </div>
          )}
        </div>

        {/* ── Body (scrollable, takes remaining space) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 px-5 md:px-6 py-4 md:py-5">
          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Strike" value={`$${initialTrade.strike}`} />
            <StatTile label="Qty" value={`×${initialTrade.qty}`} />
            <StatTile
              label="Contract"
              value={`$${initialTrade.contractPrice}`}
            />
            {isClosed && (
              <StatTile
                label="Close"
                value={
                  initialTrade.closingContractPrice != null
                    ? `$${initialTrade.closingContractPrice}`
                    : "-"
                }
              />
            )}
            {isClosed && (
              <StatTile
                label="Change"
                value={
                  initialTrade.closingContractPrice != null &&
                  initialTrade.contractPrice
                    ? `${(
                        ((initialTrade.closingContractPrice -
                          initialTrade.contractPrice) /
                          initialTrade.contractPrice) *
                        100
                      ).toFixed(0)}%`
                    : "-"
                }
                tone={
                  initialTrade.closingContractPrice != null &&
                  initialTrade.contractPrice
                    ? initialTrade.closingContractPrice >=
                      initialTrade.contractPrice
                      ? "good"
                      : "bad"
                    : "neutral"
                }
              />
            )}
            {isClosed && fees > 0 && (
              <StatTile label="Fees" value={`$${fees.toFixed(2)}`} />
            )}
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Timeline
            </div>
            <div className="border border-white/10 rounded-lg divide-y divide-white/5">
              <TimelineRow
                icon="fa-arrow-down-to-line"
                color="text-green-500"
                label="Bought"
                value={bought ? format(bought, "EEE, MMM d yyyy") : "-"}
              />
              {isClosed && (
                <TimelineRow
                  icon="fa-arrow-up-from-line"
                  color="text-red-500"
                  label="Closed"
                  value={closed ? format(closed, "EEE, MMM d yyyy") : "-"}
                />
              )}
              <TimelineRow
                icon="fa-calendar-xmark"
                color="text-white/50"
                label="Expiry"
                value={expiry ? format(expiry, "EEE, MMM d yyyy") : "-"}
              />
            </div>
          </div>

          {/* Strategy */}
          {initialTrade.strategy && initialTrade.strategy !== "All" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                Strategy
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                {initialTrade.strategy}
              </span>
            </div>
          )}

          {/* Tags */}
          {initialTrade.tags && initialTrade.tags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {initialTrade.tags.map((tag) => {
                  const kind = TAG_KIND_BY_LABEL[tag];
                  return (
                    <span
                      key={tag}
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        kind === "good"
                          ? "bg-green-500/15 border-green-500/40 text-green-500"
                          : kind === "mistake"
                            ? "bg-red-500/15 border-red-500/40 text-red-500"
                            : "bg-white/5 border-white/10 text-white/70"
                      }`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {initialTrade.notes && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Notes
              </div>
              <div className="text-sm text-white/80 bg-white/3 border border-white/5 rounded-md p-3 whitespace-pre-wrap">
                {initialTrade.notes}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (fixed at bottom of card) ── */}
        <div className="shrink-0 px-5 md:px-6 py-3 md:py-4 flex justify-end gap-2 border-t border-white/5 bg-[#0F0F17]">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
            >
              <i className="fa-regular fa-pen-to-square text-[11px]" />
              Edit
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-white";
  return (
    <div className="border border-white/10 rounded-lg px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className={`text-sm md:text-base font-semibold truncate ${color}`}>
        {value}
      </div>
    </div>
  );
}

function TimelineRow({
  icon,
  color,
  label,
  value,
}: {
  icon: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <i className={`fa-solid ${icon} ${color} text-xs w-4 text-center`}></i>
      <span className="text-xs text-white/50 uppercase tracking-wider w-16">
        {label}
      </span>
      <span className="text-sm text-white flex-1 text-right">{value}</span>
    </div>
  );
}
