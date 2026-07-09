"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { TradeEventType, Trade } from "@/app/types/Trades";
import { useStrategies } from "@/hooks/useStrategies";
import {
  TAG_KIND_BY_LABEL,
  TRADE_TAG_OPTIONS,
  TradeTagKind,
} from "@/app/data/tradeTags";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTrades } from "@/hooks/useTrades";
import { handleSave, type InvalidField } from "./helpers";

type TradeModalProps = {
  date: Date;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  initialTrade?: Partial<Trade>;
  onDelete?: (_id: string) => void;
  // Optional back-out handler. When set, Cancel / X / Escape / backdrop
  // clicks fire this instead of `onClose` — used by TradeModal to send
  // the user back to the View card rather than onCloseing the whole
  // stack when they were originally viewing an existing trade.
  onCancel?: () => void;
};

export default function EditTradeModal({
  date,
  onClose,
  onSave,
  initialTrade,
  onDelete,
  onCancel,
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
  const [strategy, setStrategy] = useState<string>(
    initialTrade?.strategy ?? "",
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
  const addTag = (raw: string) => {
    const label = raw.trim();
    if (!label) return;
    setTags((prev) =>
      // Case-insensitive dedupe so "FOMO" and "fomo" collapse, but
      // preserve the canonical casing already in the list (or the
      // suggestion list) over what the user typed.
      prev.some((t) => t.toLowerCase() === label.toLowerCase())
        ? prev
        : [...prev, label],
    );
  };
  const removeTag = (label: string) =>
    setTags((prev) => prev.filter((t) => t !== label));
  const [simulated, setSimulated] = useState<boolean>(
    initialTrade?.simulated || false,
  );
  // Invalid fields are tracked individually so the modal can outline
  // each broken input in red instead of showing a single banner. A
  // field is removed from the set as soon as the user edits it.
  const [invalidFields, setInvalidFields] = useState<Set<InvalidField>>(
    new Set(),
  );
  const isInvalid = (k: InvalidField) => invalidFields.has(k);
  const clearInvalid = (k: InvalidField) =>
    setInvalidFields((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  const [delModal, setDelModal] = useState<boolean>(false);

  const toast = useToast();
  useScrollLock();

  // Pull the user's custom strategy library and filter to the
  // currently selected direction. Until a direction is picked, show
  // every strategy so the dropdown isn't empty.
  const { data: userStrategies = [] } = useStrategies();
  const callStrategies = userStrategies
    .filter((s) => s.direction === "CALL")
    .map((s) => s.name);
  const putStrategies = userStrategies
    .filter((s) => s.direction === "PUT")
    .map((s) => s.name);
  const strategies: string[] =
    selectedOption === "CALL"
      ? [...callStrategies, "Other"]
      : selectedOption === "PUT"
        ? [...putStrategies, "Other"]
        : [...callStrategies, ...putStrategies, "Other"];
  // Preserve the trade's saved value even if the matching strategy was
  // renamed or deleted later.
  if (strategy && !strategies.includes(strategy)) {
    strategies.unshift(strategy);
  }

  // If the user flips CALL ↔ PUT and the previously chosen strategy
  // doesn't belong to the new direction, swap it for the first valid
  // option so a misaligned pairing can't be saved.
  useEffect(() => {
    if (selectedOption === null) return;
    const valid =
      selectedOption === "CALL"
        ? new Set<string>([...callStrategies, "Other"])
        : new Set<string>([...putStrategies, "Other"]);
    if (strategy && !valid.has(strategy)) {
      const first =
        selectedOption === "CALL" ? callStrategies[0] : putStrategies[0];
      setStrategy(first ?? "Other");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  // A native <select> can't represent an empty value when no <option> has
  // value="": it visually falls back to the first option while React state
  // stays "". So a brand-new trade — or one opened before the async
  // strategy list arrived — silently saves an empty strategy unless the
  // user happens to touch the dropdown. Keep the committed value in sync
  // with what's actually shown: whenever the option set changes, snap
  // `strategy` to a real option if it isn't already one.
  useEffect(() => {
    if (strategies.length === 0) return;
    if (!strategy || !strategies.includes(strategy)) {
      setStrategy(strategies[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStrategies, selectedOption]);

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
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 py-3 px-3 md:p-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="relative flex flex-col bg-[var(--background)] border border-white/10 rounded-2xl md:w-[90%] md:max-w-lg w-full max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* ── Hero header (fixed) ── */}
          <div
            className={`relative shrink-0 px-5 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6 border-b border-white/5 ${heroGradient}`}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              type="button"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>

            <div className="flex items-center gap-2 pr-10">
              {onCancel && (
                <button
                  onClick={onCancel}
                  aria-label="Back"
                  type="button"
                  className="inline-flex items-center justify-center w-6 h-6 -ml-1 rounded-full text-white/45 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-left text-[13px]"></i>
                </button>
              )}
              <div className="text-xl md:text-2xl font-bold tracking-tight">
                {symbol || "-"}
              </div>
            </div>

            {/* Direction toggle. When the form is submitted without a
                direction selected, both buttons get the same red outline
                so the missing choice is unambiguous. */}
            <div
              className={`mt-3 md:mt-4 grid grid-cols-2 gap-2 ${
                isInvalid("option")
                  ? "rounded-lg ring-2 ring-red-500/40 ring-offset-2 ring-offset-[var(--surface)] transition-shadow duration-150"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedOption("CALL");
                  clearInvalid("option");
                }}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  isCall
                    ? "bg-green-500/25 border-green-500 text-green-400"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                CALL
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOption("PUT");
                  clearInvalid("option");
                }}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  isPut
                    ? "bg-red-500/25 border-red-500 text-red-400"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                PUT
              </button>
            </div>

            {/* Status sits directly beneath direction - three buttons
                styled to match the CALL/PUT toggle above. */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  {
                    value: "OPEN" as TradeEventType,
                    label: "Open",
                    activeClass:
                      "bg-white/[0.08] border-white/30 text-white",
                  },
                  {
                    value: "WIN" as TradeEventType,
                    label: "Win",
                    activeClass:
                      "bg-green-500/25 border-green-500 text-green-400",
                  },
                  {
                    value: "LOSS" as TradeEventType,
                    label: "Loss",
                    activeClass:
                      "bg-red-500/25 border-red-500 text-red-400",
                  },
                ]
              ).map((s) => {
                const active = status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setStatus(s.value);
                      // Switching away from WIN/LOSS hides the closing
                      // input, so any prior "missing closing price" mark
                      // becomes irrelevant - drop it.
                      if (s.value === "OPEN") clearInvalid("closingContractPrice");
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                      active
                        ? s.activeClass
                        : "border-white/10 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

          </div>

          {/* ── Body (scrollable, takes remaining space) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5 md:gap-5 px-5 md:px-6 py-4 md:py-6">
            {/* Symbol */}
            <Field label="Symbol" required>
              <input
                type="text"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  clearInvalid("symbol");
                }}
                placeholder="e.g. SPY"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full p-2 text-base text-white bg-white/[0.03] rounded border focus:outline-none uppercase placeholder:normal-case placeholder:text-white/30 ${
                  isInvalid("symbol")
                    ? "border-red-500/70 ring-2 ring-red-500/15 bg-red-500/[0.04] focus:border-red-500 focus:ring-red-500/25 transition-[border-color,box-shadow,background-color] duration-150"
                    : "border-white/10 focus:border-white/30"
                }`}
              />
            </Field>

            {/* Contract / Qty / Strike */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Contract" required>
                <NumberInput
                  value={contractPrice}
                  onChange={(v) => {
                    setContractPrice(v);
                    clearInvalid("contractPrice");
                  }}
                  placeholder="0.00"
                  invalid={isInvalid("contractPrice")}
                />
              </Field>
              <Field label="Qty" required>
                <NumberInput
                  value={qty}
                  onChange={(v) => {
                    setQty(v);
                    clearInvalid("qty");
                  }}
                  placeholder="1"
                  invalid={isInvalid("qty")}
                />
              </Field>
              <Field label="Strike" className="col-span-2 md:col-span-1">
                <NumberInput
                  value={strike}
                  onChange={(v) => {
                    setStrike(v);
                    clearInvalid("strike");
                  }}
                  placeholder="0"
                  invalid={isInvalid("strike")}
                />
              </Field>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date bought" required>
                <DateInput
                  value={dateBought}
                  onChange={(v) => {
                    setDateBought(v);
                    clearInvalid("dateBought");
                  }}
                  invalid={isInvalid("dateBought")}
                />
              </Field>
              <Field label="Expiry" required>
                <DateInput
                  value={expiryDate}
                  min={dateBought}
                  onChange={(v) => {
                    setExpiryDate(v);
                    clearInvalid("expiryDate");
                  }}
                  invalid={isInvalid("expiryDate")}
                />
              </Field>
            </div>

            {/* Strategy (Status lives in the hero next to direction). */}
            <Field label="Strategy">
              <select
                value={strategy}
                onChange={(e) => {
                  setStrategy(e.target.value);
                }}
                className="w-full p-2 text-base bg-white/[0.03] text-white rounded border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer"
              >
                {strategies.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            {/* Closing block - only when WIN/LOSS */}
            {isClosed && (
              <div className="flex flex-col gap-3 p-3 md:p-4 border border-white/10 rounded-lg bg-white/3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Closing contract" required>
                    <NumberInput
                      value={closingContractPrice}
                      onChange={(v) => {
                        setClosingContractPrice(v);
                        clearInvalid("closingContractPrice");
                      }}
                      placeholder="0.00"
                      invalid={isInvalid("closingContractPrice")}
                    />
                  </Field>
                  <Field label="Date closed">
                    <DateInput
                      value={dateClosed}
                      min={dateBought}
                      max={expiryDate}
                      onChange={(v) => {
                        setDateClosed(v);
                      }}
                    />
                  </Field>
                </div>
                <Field label="Fees / commissions">
                  <NumberInput
                    value={fees}
                    onChange={(v) => setFees(v)}
                    placeholder="e.g. 2.10"
                    step="0.01"
                  />
                </Field>
              </div>
            )}

            {/* Tags - typed combobox. Autocompletes from the preset list
                plus every tag the user has previously attached to any
                trade. Anything new the user types becomes its own tag on
                Enter/comma. */}
            <Field label="Tags">
              <TagsInput
                value={tags}
                onAdd={addTag}
                onRemove={removeTag}
                userId={userId}
                simulated={simulated}
              />
            </Field>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder=""
                rows={3}
                className="w-full p-2 text-sm text-white bg-white/[0.03] rounded border border-white/10 focus:border-white/30 focus:outline-none resize-none"
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
          <div className="shrink-0 px-5 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 border-t border-white/5 bg-[var(--background)]">
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
                    setInvalidFields,
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
            className="flex flex-col gap-4 bg-[var(--background)] border border-white/10 items-center p-6 rounded-2xl w-full max-w-sm text-white"
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
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] tracking-wider text-white/40">
          {label}
          {required && (
            <span aria-hidden className="ml-1">
              *
            </span>
          )}
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
  invalid,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: string;
  invalid?: boolean;
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
      className={`w-full min-w-0 p-2 text-base text-white bg-white/[0.03] rounded border focus:outline-none placeholder:text-white/30 ${
        invalid
          ? "border-red-500/70 ring-2 ring-red-500/15 bg-red-500/[0.04] focus:border-red-500 focus:ring-red-500/25 transition-[border-color,box-shadow,background-color] duration-150"
          : "border-white/10 focus:border-white/30"
      }`}
    />
  );
}

function DateInput({
  value,
  onChange,
  min,
  max,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
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
      className={`w-full min-w-0 p-2 text-base text-white bg-white/[0.03] rounded border focus:outline-none appearance-none ${
        invalid
          ? "border-red-500/70 ring-2 ring-red-500/15 bg-red-500/[0.04] focus:border-red-500 focus:ring-red-500/25 transition-[border-color,box-shadow,background-color] duration-150"
          : "border-white/10 focus:border-white/30"
      }`}
    />
  );
}

// Combobox-style tag input. Selected tags render as removable chips on
// the left; the user types into the trailing input. Suggestions come
// from the preset list plus every tag this user has ever attached to a
// trade, filtered by what they're typing. Enter / comma / Tab commits
// the current input as a new tag (creating it if it doesn't exist).
// Backspace on an empty input removes the most recent tag for fast
// correction.
function TagsInput({
  value,
  onAdd,
  onRemove,
  userId,
  simulated,
}: {
  value: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  userId: string | undefined;
  simulated: boolean;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<number | null>(null);

  // Pull every tag the user has previously used, so autocomplete grows
  // with their journal. Cached by react-query; same hook the rest of the
  // app uses, so no extra network requests in practice.
  const { data: trades } = useTrades(userId, simulated);

  const suggestions = useMemo(() => {
    const seen = new Map<string, TradeTagKind | "other">();
    for (const preset of TRADE_TAG_OPTIONS) {
      seen.set(preset.label.toLowerCase(), preset.kind);
    }
    for (const t of trades ?? []) {
      for (const tag of t.tags ?? []) {
        const k = tag.toLowerCase();
        if (!seen.has(k)) {
          seen.set(k, TAG_KIND_BY_LABEL[tag] ?? "other");
        }
      }
    }
    return Array.from(seen.entries()).map(([k, kind]) => ({
      // Preserve original casing - look up canonical form from either
      // the preset list or the trades that introduced it.
      label:
        TRADE_TAG_OPTIONS.find((p) => p.label.toLowerCase() === k)?.label ??
        (trades ?? [])
          .flatMap((t) => t.tags ?? [])
          .find((t) => t.toLowerCase() === k) ??
        k,
      kind,
    }));
  }, [trades]);

  const selectedLower = new Set(value.map((v) => v.toLowerCase()));
  const inputLower = input.trim().toLowerCase();
  const filtered = suggestions
    .filter((s) => !selectedLower.has(s.label.toLowerCase()))
    .filter(
      (s) => !inputLower || s.label.toLowerCase().includes(inputLower),
    )
    .slice(0, 8);

  const exactExists =
    !!inputLower &&
    (suggestions.some((s) => s.label.toLowerCase() === inputLower) ||
      selectedLower.has(inputLower));

  const commit = (label: string) => {
    onAdd(label);
    setInput("");
  };

  const chipClasses = (kind: TradeTagKind | "other" | undefined) =>
    kind === "mistake"
      ? "bg-red-500/15 border-red-500/50 text-red-400"
      : kind === "good"
        ? "bg-green-500/15 border-green-500/50 text-green-400"
        : "bg-white/[0.06] border-white/15 text-white/80";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (input.trim()) {
        e.preventDefault();
        commit(input.trim());
      }
      return;
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      onRemove(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Chip strip + inline input. Looks like a single field. */}
      <div
        className="flex flex-wrap items-center gap-1.5 p-1.5 rounded border border-white/10 bg-white/[0.03] focus-within:border-white/30 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => {
          const kind = TAG_KIND_BY_LABEL[tag] ?? "other";
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${chipClasses(kind)}`}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(tag);
                }}
                aria-label={`Remove ${tag}`}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-[10px]" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            // Delay so a click on a suggestion chip lands before the
            // dropdown unmounts.
            blurTimer.current = window.setTimeout(() => setFocused(false), 120);
          }}
          placeholder={value.length === 0 ? "Add tag" : ""}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-white placeholder-white/35 px-1.5 py-1 outline-none"
        />
      </div>

      {/* Suggestion dropdown - shown when focused. If the user has typed
          something that doesn't match any existing tag, the first option
          is a "Create" affordance so they know it'll become a brand-new
          tag. */}
      {focused && (filtered.length > 0 || (inputLower && !exactExists)) && (
        <div className="flex flex-wrap gap-1.5">
          {inputLower && !exactExists && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(input.trim())}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-teal-500/40 text-teal-300 bg-teal-500/[0.08] hover:bg-teal-500/[0.18] transition cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              Create &quot;{input.trim()}&quot;
            </button>
          )}
          {filtered.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s.label)}
              className={`px-2.5 py-1 rounded-full text-xs border transition cursor-pointer border-white/10 text-white/65 hover:bg-white/[0.06] hover:text-white`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
