"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { TradeEventType, StrategyList, Trade } from "@/app/types/Trades";
import { TRADE_TAG_OPTIONS } from "@/app/data/tradeTags";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";
import { useScrollLock } from "@/hooks/useScrollLock";
import { handleSave } from "./helpers";

type TradeModalProps = {
  date: Date;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  initialTrade?: Partial<Trade>;
  onDelete?: (_id: string) => void;
};

export default function EditTradeModal({
  date,
  onClose,
  onSave,
  initialTrade,
  onDelete,
}: TradeModalProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [symbol, setSymbol] = useState<string>(initialTrade?.symbol ?? "");
  const [contractPrice, setContractPrice] = useState<number | null>(
    initialTrade?.contractPrice ?? null,
  );
  const [qty, setQty] = useState<number | null>(initialTrade?.qty ?? null);
  const [strike, setStrike] = useState<number | null>(
    initialTrade?.strike ?? null,
  );
  const [dateBought, setDateBought] = useState<string>(
    initialTrade?.dateBought
      ? format(new Date(initialTrade.dateBought), "yyyy-MM-dd")
      : format(date, "yyyy-MM-dd"),
  );
  const [expiryDate, setExpiryDate] = useState<string>(
    initialTrade?.expiryDate
      ? format(new Date(initialTrade.expiryDate), "yyyy-MM-dd")
      : format(date, "yyyy-MM-dd"),
  );
  const [dateClosed, setDateClosed] = useState<string>(
    initialTrade?.dateClosed
      ? format(new Date(initialTrade.dateClosed), "yyyy-MM-dd")
      : format(date, "yyyy-MM-dd"),
  );
  const [status, setStatus] = useState<TradeEventType>(
    initialTrade?.status ?? "OPEN",
  );
  const [strategy, setStrategy] = useState<StrategyList>(
    initialTrade?.strategy ?? "Moving Average 40",
  );
  const [closingContractPrice, setClosingContractPrice] = useState<
    number | null
  >(initialTrade?.closingContractPrice ?? null);
  const [fees, setFees] = useState<number | null>(initialTrade?.fees ?? null);
  const [selectedOption, setSelectedOption] = useState<"CALL" | "PUT" | null>(
    initialTrade?.option ?? null,
  );
  const [notes, setNotes] = useState<string>(initialTrade?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initialTrade?.tags ?? []);
  const toggleTag = (label: string) =>
    setTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  const [simulated, setSimulated] = useState<boolean>(
    initialTrade?.simulated || false,
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [delModal, setDelModal] = useState<boolean>(false);

  const toast = useToast();
  useScrollLock();

  const strategies: StrategyList[] = [
    "Moving Average 40",
    "Normal Fall & Hard Fall",
    "Bearish Channel Break",
    "Normal Bullish Gap",
    "Bearish Gap Uptrend",
    "Hard Floor",
    "The First Uptrend Gap",
    "First Red Opening Candle",
    "Gap Floor Break",
    "Model of 4 Steps",
    "Hanger in Daily",
    "Other",
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCall = selectedOption === "CALL";
  const isPut = selectedOption === "PUT";
  const isClosed = status === "WIN" || status === "LOSS";
  const isEditing = !!initialTrade?._id;

  const heroGradient = isCall
    ? "bg-gradient-to-br from-green-500/15 via-transparent to-transparent"
    : isPut
      ? "bg-gradient-to-br from-red-500/15 via-transparent to-transparent"
      : "bg-gradient-to-br from-white/5 via-transparent to-transparent";

  return (
    <>
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
          className="relative flex flex-col bg-[#0F0F17] border border-white/10 rounded-2xl md:w-[90%] md:max-w-lg w-full max-h-full md:max-h-[90vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* ── Hero header (fixed) ── */}
          <div
            className={`relative shrink-0 px-5 md:px-6 pt-5 md:pt-6 pb-5 md:pb-6 border-b border-white/5 ${heroGradient}`}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              type="button"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>

            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              {isEditing ? "Edit trade" : "New trade"}
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight">
              {symbol || "—"}
            </div>

            {/* Direction toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedOption("CALL");
                  setErrorMessage("");
                }}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  isCall
                    ? "bg-green-500/25 border-green-500 text-green-400"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                <i className="fa-solid fa-arrow-trend-up mr-1.5 text-xs"></i>
                CALL
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOption("PUT");
                  setErrorMessage("");
                }}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  isPut
                    ? "bg-red-500/25 border-red-500 text-red-400"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                <i className="fa-solid fa-arrow-trend-down mr-1.5 text-xs"></i>
                PUT
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 border border-red-500/50 text-red-400 text-center text-xs py-1.5 rounded-md bg-red-500/10 shake">
                {errorMessage}
              </div>
            )}
          </div>

          {/* ── Body (scrollable, takes remaining space) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 px-5 md:px-6 py-5 md:py-6">
            {/* Symbol */}
            <Field label="Symbol">
              <input
                type="text"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setErrorMessage("");
                }}
                placeholder="e.g. SPY"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="w-full p-2 text-base text-white bg-[#1A1A1D] rounded border border-white/10 focus:border-white/30 focus:outline-none uppercase placeholder:normal-case placeholder:text-white/30"
              />
            </Field>

            {/* Contract / Qty / Strike */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Contract">
                <NumberInput
                  value={contractPrice}
                  onChange={(v) => {
                    setContractPrice(v);
                    setErrorMessage("");
                  }}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Qty">
                <NumberInput
                  value={qty}
                  onChange={(v) => {
                    setQty(v);
                    setErrorMessage("");
                  }}
                  placeholder="1"
                />
              </Field>
              <Field label="Strike" className="col-span-2 md:col-span-1">
                <NumberInput
                  value={strike}
                  onChange={(v) => {
                    setStrike(v);
                    setErrorMessage("");
                  }}
                  placeholder="0"
                />
              </Field>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date Bought">
                <DateInput
                  value={dateBought}
                  onChange={(v) => {
                    setDateBought(v);
                    setErrorMessage("");
                  }}
                />
              </Field>
              <Field label="Expiry">
                <DateInput
                  value={expiryDate}
                  min={dateBought}
                  onChange={(v) => {
                    setExpiryDate(v);
                    setErrorMessage("");
                  }}
                />
              </Field>
            </div>

            {/* Strategy / Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Strategy">
                <select
                  value={strategy}
                  onChange={(e) => {
                    setStrategy(e.target.value as StrategyList);
                    setErrorMessage("");
                  }}
                  className="w-full p-2 text-base bg-[#1A1A1D] text-white rounded border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer"
                >
                  {strategies.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as TradeEventType);
                    setErrorMessage("");
                  }}
                  className="w-full p-2 text-base bg-[#1A1A1D] text-white rounded border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer"
                >
                  <option value="OPEN">Open</option>
                  <option value="WIN">Win</option>
                  <option value="LOSS">Loss</option>
                </select>
              </Field>
            </div>

            {/* Closing block — only when WIN/LOSS */}
            {isClosed && (
              <div className="flex flex-col gap-3 p-3 md:p-4 border border-white/10 rounded-lg bg-white/3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Closing details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Closing Contract">
                    <NumberInput
                      value={closingContractPrice}
                      onChange={(v) => {
                        setClosingContractPrice(v);
                        setErrorMessage("");
                      }}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Date Closed">
                    <DateInput
                      value={dateClosed}
                      min={dateBought}
                      max={expiryDate}
                      onChange={(v) => {
                        setDateClosed(v);
                        setErrorMessage("");
                      }}
                    />
                  </Field>
                </div>
                <Field
                  label="Fees / Commissions"
                  hint="Optional · total round-trip"
                >
                  <NumberInput
                    value={fees}
                    onChange={(v) => setFees(v)}
                    placeholder="e.g. 2.10"
                    step="0.01"
                  />
                </Field>
              </div>
            )}

            {/* Tags */}
            <Field label="Tags" hint={`${tags.length} selected`}>
              <div className="flex flex-wrap gap-1.5">
                {TRADE_TAG_OPTIONS.map(({ label, kind }) => {
                  const selected = tags.includes(label);
                  const selectedClasses =
                    kind === "mistake"
                      ? "bg-red-500/15 border-red-500/50 text-red-400"
                      : "bg-green-500/15 border-green-500/50 text-green-400";
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleTag(label)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ${
                        selected
                          ? selectedClasses
                          : "border-white/10 text-white/60 hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Notes */}
            <Field label="Notes" hint="Optional">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you see? What did you learn?"
                rows={3}
                className="w-full p-2 text-sm text-white bg-[#1A1A1D] rounded border border-white/10 focus:border-white/30 focus:outline-none resize-none"
              />
            </Field>

            {/* Simulated */}
            <label className="flex items-center gap-2 cursor-pointer group select-none w-fit">
              <input
                type="checkbox"
                checked={simulated}
                onChange={(e) => setSimulated(e.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <span className="text-sm text-white/70 group-hover:text-white transition">
                Mark as simulated
              </span>
            </label>
          </div>

          {/* ── Footer (fixed at bottom of card) ── */}
          <div className="shrink-0 px-5 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 border-t border-white/5 bg-[#0F0F17]">
            <div>
              {onDelete && initialTrade?._id && (
                <button
                  type="button"
                  onClick={() => setDelModal(true)}
                  className="inline-flex items-center justify-center gap-2 w-9 h-9 rounded-full bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20 transition cursor-pointer"
                  aria-label="Delete trade"
                >
                  <i className="fa-solid fa-trash-can text-[12px]" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSave(
                    setErrorMessage,
                    date,
                    selectedOption,
                    userId as string,
                    symbol,
                    contractPrice,
                    qty,
                    strike,
                    dateBought,
                    expiryDate,
                    status,
                    closingContractPrice,
                    strategy,
                    dateClosed,
                    notes,
                    tags,
                    simulated,
                    toast,
                    onSave,
                    initialTrade!,
                    fees,
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk text-[11px]" />
                {isEditing ? "Save" : "Create trade"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Delete confirmation */}
      {onDelete && initialTrade?._id && delModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setDelModal(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col gap-4 bg-[#0F0F17] border border-white/10 items-center p-6 rounded-2xl w-full max-w-sm text-white"
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
            <div className="text-center text-sm">
              Are you sure you want to delete this trade? This cannot be undone.
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
                onClick={() => setDelModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition text-[13px] font-medium cursor-pointer"
                onClick={() => {
                  onDelete(initialTrade._id!);
                  toast(`Trade deleted successfully!`);
                }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

// ─── Form primitives ───────────────────────────────────────────────────
function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </label>
        {hint && <span className="text-[10px] text-white/30">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value == null || isNaN(value) ? "" : value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(isNaN(v) ? null : v);
      }}
      placeholder={placeholder}
      className="w-full min-w-0 p-2 text-base text-white bg-[#1A1A1D] rounded border border-white/10 focus:border-white/30 focus:outline-none placeholder:text-white/30"
    />
  );
}

function DateInput({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      // `min-w-0` overrides iOS Safari's intrinsic min-width on date
      // inputs (otherwise the picker swallows grid gaps on narrow
      // screens); `appearance-none` strips the inset shadow.
      className="w-full min-w-0 p-2 text-base text-white bg-[#1A1A1D] rounded border border-white/10 focus:border-white/30 focus:outline-none appearance-none"
    />
  );
}
