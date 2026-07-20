"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Trade, TradeEventType } from "@/app/types/Trades";
import { useStrategies } from "@/hooks/useStrategies";
import {
  TAG_KIND_BY_LABEL,
  TRADE_TAG_OPTIONS,
  TradeTagKind,
} from "@/app/data/tradeTags";
import { useTrades } from "@/hooks/useTrades";
import { useToast } from "@/hooks/useToast";
import { withAuth } from "@/lib/withAuth";
import RichNotesEditor from "@/components/RichNotesEditor";
import { Skeleton } from "@/components/Loaders";
import TradeShareModal from "@/components/TradeShareModal";

// Full-page trade editor. Trade fields live on the left, the rich
// notes editor lives on the right. Replaces the row-click → modal
// flow on the trades table; the modal is still available as a quick
// edit via the pencil icon on each row.

function fetchTrade(id: string): Promise<Trade> {
  return fetch(`/api/trades/${id}`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch trade");
    return r.json();
  });
}

// Coerce a stored date into the `yyyy-MM-dd` a <DateField> expects.
// Stored values arrive as ISO timestamps (local midnight persisted as
// UTC), so slicing on "T" would read the UTC day and drift back one day
// in zones ahead of UTC. Convert through the local zone instead — the
// same thing the trades table does with toLocaleDateString — while
// passing through values the user has already edited to plain dates.
function toDateInput(value?: string): string {
  if (!value) return "";
  return value.includes("T") ? format(new Date(value), "yyyy-MM-dd") : value;
}

function TradeDetailPage() {
  const router = useRouter();
  const params = useParams<{ userId: string; tradeId: string }>();
  const userId = params.userId;
  const tradeId = params.tradeId;
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: trade, isLoading, isError } = useQuery<Trade>({
    queryKey: ["trade", tradeId],
    queryFn: () => fetchTrade(tradeId),
    enabled: !!tradeId,
  });

  // Local form state mirrors the loaded trade. We swap to the fetched
  // values once the query resolves; users edit locally and Save commits.
  const [form, setForm] = useState<Trade | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (trade) {
      setForm(trade);
      setNotes(trade.notes ?? "");
    }
  }, [trade]);

  const dirty = useMemo(() => {
    if (!form || !trade) return false;
    // Cheap deep-ish diff: any field on the form or the notes changed.
    return (
      JSON.stringify({ ...form, notes }) !==
      JSON.stringify({ ...trade, notes: trade.notes ?? "" })
    );
  }, [form, notes, trade]);

  // Strategy list narrows to direction-relevant setups once a
  // direction is chosen, sourced from the user's custom library.
  const { data: userStrategies = [] } = useStrategies();
  const strategies = useMemo<string[]>(() => {
    const names = userStrategies
      .filter((s) => !form?.option || s.direction === form.option)
      .map((s) => s.name);
    // Keep the trade's saved strategy in the list even if it has since
    // been renamed/deleted, so the field doesn't silently flip.
    if (form?.strategy && !names.includes(form.strategy)) {
      names.unshift(form.strategy);
    }
    return [...names, "Other"];
  }, [userStrategies, form?.option, form?.strategy]);

  const setField = <K extends keyof Trade>(key: K, value: Trade[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const isClosed = form?.status === "WIN" || form?.status === "LOSS";

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      // Re-derive profitLoss from the close/buy prices so a manual
      // edit to either side keeps it consistent with the matcher.
      let profitLoss = form.profitLoss ?? 0;
      if (
        form.closingContractPrice != null &&
        form.contractPrice != null &&
        form.qty != null
      ) {
        profitLoss = Number(
          (
            (form.closingContractPrice - form.contractPrice) *
            100 *
            form.qty
          ).toFixed(2),
        );
      }
      const payload: Trade = {
        ...form,
        notes,
        profitLoss:
          form.status === "WIN" || form.status === "LOSS" ? profitLoss : null,
        closingContractPrice:
          form.status === "WIN" || form.status === "LOSS"
            ? form.closingContractPrice
            : null,
        fees: form.status === "OPEN" ? null : form.fees ?? null,
      };
      await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trade", tradeId] }),
        queryClient.invalidateQueries({ queryKey: ["trades", userId] }),
      ]);
      toast(`Trade ${form.symbol} saved`);
    } catch {
      toast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tradeId) return;
    setSaving(true);
    try {
      await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
      toast("Trade deleted");
      router.replace(`/trades/${userId}`);
    } catch {
      toast("Delete failed");
    } finally {
      setSaving(false);
      setDelConfirm(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="w-full max-w-[1500px] mx-auto md:mx-0 px-4 md:px-8 py-6 md:py-10 flex flex-col gap-5">
        <Skeleton className="h-7 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" delay={0.05} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full max-w-[1500px] mx-auto md:mx-0 px-4 md:px-8 py-10">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 text-sm text-red-300">
          Couldn&apos;t load this trade.
        </div>
        <Link
          href={`/trades/${userId}`}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-white/65 hover:text-white"
        >
          <i className="fa-solid fa-chevron-left text-[11px]" />
          Back to trades
        </Link>
      </div>
    );
  }

  const isCall = form.option === "CALL";
  const isPut = form.option === "PUT";

  return (
    <div className="w-full max-w-[1500px] mx-auto md:mx-0 px-4 md:px-8 pt-24 md:pt-8 pb-6 flex flex-col gap-4 md:h-[100dvh]">
      {/* One container — trade fields on the left, the wider notes
          editor on the right, filling the viewport height. A
          full-width action row pins to the bottom of the card. */}
      <div className="md:flex-1 md:min-h-0 flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md shadow-[0_2px_24px_var(--shadow-soft)] overflow-hidden">
       <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        {/* LEFT — Trade fields */}
        <div className="md:overflow-y-auto thin-scroll p-5 md:p-6 flex flex-col gap-5 border-b md:border-b-0 md:border-r border-white/10">
          {/* Top row — back chevron + symbol input */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/trades/${userId}`}
              aria-label="Back to trades"
              className="shrink-0 inline-flex items-center justify-center text-white/55 hover:text-white transition cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-[15px]" />
            </Link>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setField("symbol", e.target.value.toUpperCase())}
              placeholder="e.g. SPY"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 p-2 text-base font-semibold text-white bg-white/[0.03] rounded border border-white/10 focus:border-white/30 focus:outline-none uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30"
            />
          </div>

          {/* Direction + status */}
          <div className="flex flex-col gap-2">
            <Label>Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setField("option", "CALL")}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  isCall
                    ? "bg-green-500/25 border-green-500 text-green-400"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                <i className="fa-solid fa-arrow-trend-up mr-1.5 text-xs" />
                CALL
              </button>
              <button
                type="button"
                onClick={() => setField("option", "PUT")}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  isPut
                    ? "bg-red-500/25 border-red-500 text-red-400"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                <i className="fa-solid fa-arrow-trend-down mr-1.5 text-xs" />
                PUT
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: "OPEN", label: "Open", active: "bg-white/[0.08] border-white/30 text-white" },
                  { v: "WIN", label: "Win", active: "bg-green-500/25 border-green-500 text-green-400" },
                  { v: "LOSS", label: "Loss", active: "bg-red-500/25 border-red-500 text-red-400" },
                ] as { v: TradeEventType; label: string; active: string }[]
              ).map((s) => {
                const active = form.status === s.v;
                return (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setField("status", s.v)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                      active
                        ? s.active
                        : "border-white/10 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <FieldGroup label="Contract" required>
              <NumberField
                value={form.contractPrice}
                onChange={(v) => setField("contractPrice", v ?? 0)}
                placeholder="0.00"
                step="0.01"
              />
            </FieldGroup>
            <FieldGroup label="Qty" required>
              <NumberField
                value={form.qty}
                onChange={(v) => setField("qty", v ?? 0)}
                placeholder="1"
              />
            </FieldGroup>
            <FieldGroup
              label="Strike"
              required
              className="col-span-2 md:col-span-1"
            >
              <NumberField
                value={form.strike}
                onChange={(v) => setField("strike", v ?? 0)}
                placeholder="0"
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Date bought" required>
              <DateField
                value={toDateInput(form.dateBought)}
                onChange={(v) => setField("dateBought", v)}
              />
            </FieldGroup>
            <FieldGroup label="Expiry" required>
              <DateField
                value={toDateInput(form.expiryDate)}
                min={toDateInput(form.dateBought)}
                onChange={(v) => setField("expiryDate", v)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Strategy">
            <select
              value={form.strategy}
              onChange={(e) =>
                setField("strategy", e.target.value)
              }
              className="w-full p-2 text-base bg-white/[0.03] text-white rounded border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer"
            >
              {strategies.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FieldGroup>

          {isClosed && (
            <div className="flex flex-col gap-3 p-3 md:p-4 border border-white/10 rounded-lg bg-white/[0.02]">
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Closing contract" required>
                  <NumberField
                    value={form.closingContractPrice ?? null}
                    onChange={(v) => setField("closingContractPrice", v)}
                    placeholder="0.00"
                    step="0.01"
                  />
                </FieldGroup>
                <FieldGroup label="Date closed">
                  <DateField
                    value={toDateInput(form.dateClosed)}
                    min={toDateInput(form.dateBought)}
                    max={toDateInput(form.expiryDate)}
                    onChange={(v) => setField("dateClosed", v)}
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Fees / commissions">
                <NumberField
                  value={form.fees ?? null}
                  onChange={(v) => setField("fees", v)}
                  placeholder="e.g. 2.10"
                  step="0.01"
                />
              </FieldGroup>
            </div>
          )}

          <FieldGroup label="Tags">
            <TagsRow
              value={form.tags ?? []}
              onChange={(tags) => setField("tags", tags)}
            />
          </FieldGroup>

          <label className="flex items-center gap-2 cursor-pointer group select-none w-fit">
            <input
              type="checkbox"
              checked={form.simulated}
              onChange={(e) => setField("simulated", e.target.checked)}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
            <span className="text-sm text-white/70 group-hover:text-white transition">
              Mark as simulated
            </span>
          </label>

        </div>

        {/* RIGHT — Notes editor fills the panel */}
        <div className="flex flex-col min-h-0">
          <RichNotesEditor
            value={notes}
            onChange={setNotes}
            className="flex-1 min-h-[55vh] md:min-h-0 h-full w-full"
          />
        </div>
       </div>

        {/* Actions — full-width row pinned to the bottom of the card */}
        <div className="shrink-0 px-5 md:px-6 py-3 flex items-center justify-between gap-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDelConfirm(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-red-500/25 bg-red-500/[0.08] text-red-300 hover:bg-red-500/15 transition text-[12.5px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-trash text-[11px]" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-share-nodes text-[11px]" />
              Share
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/trades/${userId}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[12.5px] font-medium ${
                dirty && !saving
                  ? "bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25 cursor-pointer"
                  : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
              }`}
            >
              <i className="fa-solid fa-check text-[11px]" />
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
      </div>

      {/* Share as image */}
      {shareOpen && (
        <TradeShareModal trade={form} onClose={() => setShareOpen(false)} />
      )}

      {/* Delete confirmation */}
      {delConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setDelConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col gap-4 bg-[var(--surface)] border border-white/10 items-center p-6 rounded-2xl w-full max-w-sm text-white"
          >
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl" />
            <div className="text-center text-sm">
              Delete this trade? This cannot be undone.
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
                onClick={() => setDelConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition text-[13px] font-medium cursor-pointer"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(TradeDetailPage);

// ─── Form primitives ───────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] tracking-[0.04em] text-white/45">
      {children}
    </label>
  );
}

function FieldGroup({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <Label>
        {label}
        {required && <span className="ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function NumberField({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value == null || Number.isNaN(value) ? "" : value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isNaN(v) ? null : v);
      }}
      placeholder={placeholder}
      className="w-full min-w-0 p-2 text-base text-white bg-white/[0.03] rounded border border-white/10 focus:border-white/30 focus:outline-none placeholder:text-white/30"
    />
  );
}

function DateField({
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
      className="w-full min-w-0 p-2 text-base text-white bg-white/[0.03] rounded border border-white/10 focus:border-white/30 focus:outline-none appearance-none"
    />
  );
}

// Lightweight tag picker - matches the EditTradeModal combobox behavior
// (preset list + previously-used + free-text create).
function TagsRow({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { data: trades } = useTrades(undefined, undefined);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const seen = new Map<string, TradeTagKind | "other">();
    for (const p of TRADE_TAG_OPTIONS)
      seen.set(p.label.toLowerCase(), p.kind);
    for (const t of trades ?? []) {
      for (const tag of t.tags ?? []) {
        const k = tag.toLowerCase();
        if (!seen.has(k))
          seen.set(k, TAG_KIND_BY_LABEL[tag] ?? "other");
      }
    }
    return Array.from(seen.entries()).map(([k, kind]) => ({
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
    .filter((s) => !inputLower || s.label.toLowerCase().includes(inputLower))
    .slice(0, 8);

  const add = (raw: string) => {
    const label = raw.trim();
    if (!label) return;
    if (value.some((t) => t.toLowerCase() === label.toLowerCase())) return;
    onChange([...value, label]);
    setInput("");
  };

  const remove = (tag: string) =>
    onChange(value.filter((t) => t !== tag));

  const chipClasses = (kind: TradeTagKind | "other" | undefined) =>
    kind === "mistake"
      ? "bg-red-500/15 border-red-500/50 text-red-400"
      : kind === "good"
        ? "bg-green-500/15 border-green-500/50 text-green-400"
        : "bg-white/[0.06] border-white/15 text-white/80";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded border border-white/10 bg-white/[0.03] focus-within:border-white/30">
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
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-[10px]" />
              </button>
            </span>
          );
        })}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              if (input.trim()) {
                e.preventDefault();
                add(input.trim());
              }
            } else if (e.key === "Backspace" && !input && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={value.length === 0 ? "Add tag" : ""}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-white placeholder-white/35 px-1.5 py-1 outline-none"
        />
      </div>
      {focused && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s.label)}
              className="px-2.5 py-1 rounded-full text-xs border transition cursor-pointer border-white/10 text-white/65 hover:bg-white/[0.06] hover:text-white"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
