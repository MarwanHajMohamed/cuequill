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
import { useScrollLock } from "@/hooks/useScrollLock";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneyFull } from "@/lib/helpers/fmt";
import { hapticNotify } from "@/lib/haptics";

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
// in zones ahead of UTC. Convert through the local zone instead - the
// same thing the trades table does with toLocaleDateString - while
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
  // The page opens as a read-only summary; the Edit button reveals the
  // editable fields (and the notes editor). Deep-link ?edit=1 opens straight
  // into edit mode (used right after creating a trade).
  const [editing, setEditing] = useState(false);

  // Share modal locks scroll itself (via ShareImageModal); cover the
  // delete-confirmation dialog here.
  useScrollLock(delConfirm);

  useEffect(() => {
    if (trade) {
      setForm(trade);
      setNotes(trade.notes ?? "");
    }
  }, [trade]);

  // Open directly in edit mode when arrived via ?edit=1 (e.g. straight after
  // creating a trade), then clear the flag so a refresh reopens read-only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("edit") === "1") {
      setEditing(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Discard edits and return to the read-only summary.
  const handleCancel = () => {
    if (trade) {
      setForm(trade);
      setNotes(trade.notes ?? "");
    }
    setEditing(false);
  };

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
      // "BOTH" strategies apply to either side, so they match any option.
      .filter(
        (s) =>
          !form?.option ||
          s.direction === form.option ||
          s.direction === "BOTH",
      )
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
        timeExited: form.status === "OPEN" ? "" : form.timeExited ?? "",
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
      // Refresh trade-based challenge progress live.
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast(`Trade ${form.symbol} saved`);
      hapticNotify("success");
      setEditing(false);
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
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
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
    <div className="w-full px-4 md:px-8 pt-24 md:pt-8 pb-6 flex flex-col gap-4 md:h-[100dvh]">
      {/* One container - trade fields on the left, the wider notes
          editor on the right, filling the viewport height. A
          full-width action row pins to the bottom of the card. */}
      <div className="md:flex-1 md:min-h-0 flex flex-col">
       {/* md–lg: proportional. xl+ (zoomed out / wide): fields fixed, notes
           take all the extra width. The left fields sit bare on the page;
           only the notes editor keeps its own card. */}
       <div className="flex-1 min-h-0 grid grid-cols-1 gap-5 md:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
        {/* LEFT - Trade fields, no container */}
        <div className="md:overflow-y-auto thin-scroll md:py-1 md:pr-1 flex flex-col gap-4">
          {/* Top row - back chevron + (symbol input while editing / Edit
              button while viewing) */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/trades/${userId}`}
              aria-label="Back to trades"
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-white/55 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-[13px]" />
            </Link>
            {editing ? (
              <input
                type="text"
                value={form.symbol}
                onChange={(e) =>
                  setField("symbol", e.target.value.toUpperCase())
                }
                placeholder="e.g. SPY"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-[15px] font-semibold text-white bg-white/[0.03] rounded-lg border border-white/10 focus:border-white/25 focus:outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30"
              />
            ) : (
              <>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/12 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer"
                >
                  <i className="fa-solid fa-pen text-[10px]" />
                  Edit
                </button>
              </>
            )}
          </div>

          {!editing && <TradeSummary trade={form} />}

          {editing && (
          <>
          {/* Direction */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Direction</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setField("option", "CALL")}
                  className={`px-2 py-1.5 rounded-lg border text-[12.5px] font-semibold transition cursor-pointer ${
                    isCall
                      ? "bg-green-500/20 border-green-500/70 text-green-400"
                      : "border-white/10 text-white/55 hover:bg-white/5"
                  }`}
                >
                  <i className="fa-solid fa-arrow-trend-up mr-1 text-[10px]" />
                  CALL
                </button>
                <button
                  type="button"
                  onClick={() => setField("option", "PUT")}
                  className={`px-2 py-1.5 rounded-lg border text-[12.5px] font-semibold transition cursor-pointer ${
                    isPut
                      ? "bg-red-500/20 border-red-500/70 text-red-400"
                      : "border-white/10 text-white/55 hover:bg-white/5"
                  }`}
                >
                  <i className="fa-solid fa-arrow-trend-down mr-1 text-[10px]" />
                  PUT
                </button>
              </div>
            </div>

            {/* Status - on its own line below Direction */}
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { v: "OPEN", label: "Open", active: "bg-white/[0.08] border-white/30 text-white" },
                    { v: "WIN", label: "Win", active: "bg-green-500/20 border-green-500/70 text-green-400" },
                    { v: "LOSS", label: "Loss", active: "bg-red-500/20 border-red-500/70 text-red-400" },
                  ] as { v: TradeEventType; label: string; active: string }[]
                ).map((s) => {
                  const active = form.status === s.v;
                  return (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => setField("status", s.v)}
                      className={`px-1.5 py-1.5 rounded-lg border text-[12px] font-semibold transition cursor-pointer ${
                        active
                          ? s.active
                          : "border-white/10 text-white/55 hover:bg-white/5"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
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

          <div className="grid grid-cols-2 gap-2.5">
            <FieldGroup label="Date bought" required>
              <DateField
                value={toDateInput(form.dateBought)}
                onChange={(v) => setField("dateBought", v)}
              />
            </FieldGroup>
            <FieldGroup label="Time entered">
              <TimeField
                value={form.timeEntered ?? ""}
                onChange={(v) => setField("timeEntered", v)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Expiry" required>
            <DateField
              value={toDateInput(form.expiryDate)}
              min={toDateInput(form.dateBought)}
              onChange={(v) => setField("expiryDate", v)}
            />
          </FieldGroup>

          <FieldGroup label="Strategy">
            <select
              value={form.strategy}
              onChange={(e) => setField("strategy", e.target.value)}
              className={`${INPUT_CLS} cursor-pointer`}
            >
              {strategies.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FieldGroup>

          {isClosed && (
            <div className="flex flex-col gap-2.5 p-3 border border-white/10 rounded-lg bg-white/[0.02]">
              <div className="grid grid-cols-2 gap-2.5">
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
              <div className="grid grid-cols-2 gap-2.5">
                <FieldGroup label="Time exited">
                  <TimeField
                    value={form.timeExited ?? ""}
                    onChange={(v) => setField("timeExited", v)}
                  />
                </FieldGroup>
                <FieldGroup label="Fees / commissions">
                  <NumberField
                    value={form.fees ?? null}
                    onChange={(v) => setField("fees", v)}
                    placeholder="e.g. 2.10"
                    step="0.01"
                  />
                </FieldGroup>
              </div>
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
              className="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
            />
            <span className="text-[13px] text-white/65 group-hover:text-white transition">
              Mark as simulated
            </span>
          </label>
          </>
          )}

        </div>

        {/* RIGHT - Notes: editable while editing, read-only otherwise */}
        <div className="flex flex-col min-h-0">
          {editing ? (
            <RichNotesEditor
              value={notes}
              onChange={setNotes}
              className="flex-1 min-h-[55vh] md:min-h-0 h-full w-full"
            />
          ) : (
            <ReadOnlyNotes html={notes} />
          )}
        </div>
       </div>

        {/* Actions - full-width row pinned to the bottom */}
        <div className="shrink-0 pt-3 mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {editing && (
              <>
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
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Share"
              title="Share"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition cursor-pointer"
            >
              <i className="fa-solid fa-share-nodes text-[12px]" />
            </button>
            <button
              type="button"
              onClick={() => setDelConfirm(true)}
              aria-label="Delete"
              title="Delete"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-red-500/25 bg-red-500/[0.08] text-red-300 hover:bg-red-500/15 transition cursor-pointer"
            >
              <i className="fa-solid fa-trash text-[12px]" />
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

// ─── Read-only summary ─────────────────────────────────────────────

// The default (non-editing) left panel: identity, a Net P/L hero with
// return% and R-multiple, and a grid of the trade's stats.
function TradeSummary({ trade }: { trade: Trade }) {
  const isClosed = trade.status === "WIN" || trade.status === "LOSS";
  const net = tradeNetPL(trade);
  const cost = (trade.contractPrice ?? 0) * (trade.qty ?? 0) * 100;
  const hasCost = Number.isFinite(cost) && cost > 0;
  const returnPct = isClosed && hasCost ? (net / cost) * 100 : null;
  const rMultiple = isClosed && hasCost ? net / cost : null;
  const change =
    isClosed &&
    trade.contractPrice &&
    trade.closingContractPrice != null
      ? ((trade.closingContractPrice - trade.contractPrice) /
          trade.contractPrice) *
        100
      : null;
  const heldDays =
    isClosed && trade.dateClosed
      ? Math.max(
          0,
          Math.round(
            (new Date(trade.dateClosed).getTime() -
              new Date(trade.dateBought).getTime()) /
              86_400_000,
          ),
        )
      : null;

  const isCall = trade.option === "CALL";
  const dateStr = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString("en-GB") : "-";
  const signed = (n: number, suffix = "", digits = 2) =>
    `${n >= 0 ? "" : "−"}${Math.abs(n).toFixed(digits)}${suffix}`;

  const optionChip = isCall
    ? "bg-green-500/15 text-green-400 border-green-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";
  const statusChip =
    trade.status === "OPEN"
      ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
      : trade.status === "WIN"
        ? "bg-green-500/15 text-green-400 border-green-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";
  const plColor = !isClosed
    ? "text-white/50"
    : net >= 0
      ? "text-green-400"
      : "text-red-400";

  return (
    <div className="flex flex-col gap-4">
      {/* Identity */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-bold tracking-tight">
            {trade.symbol}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${optionChip}`}
          >
            {trade.option}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${statusChip}`}
          >
            {trade.status}
          </span>
          {trade.simulated && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border bg-orange-500/10 text-orange-300 border-orange-500/30">
              SIM
            </span>
          )}
        </div>
        <div className="mt-1.5 text-[12px] text-white/45 tabular-nums">
          ${trade.strike} strike · {trade.qty} contract
          {trade.qty === 1 ? "" : "s"}
        </div>
      </div>

      {/* Net P/L hero */}
      <div>
        <div className="text-[11px] text-white/40">Net P/L</div>
        <div
          className={`mt-1 text-[26px] font-semibold tabular-nums ${plColor}`}
        >
          {isClosed ? fmtMoneyFull(net) : "Open"}
        </div>
        {isClosed && (returnPct != null || rMultiple != null) && (
          <div className="mt-1.5 flex items-center gap-3 text-[12.5px] tabular-nums">
            {returnPct != null && (
              <span
                className={returnPct >= 0 ? "text-green-400" : "text-red-400"}
              >
                {signed(returnPct, "%", 1)} return
              </span>
            )}
            {rMultiple != null && (
              <span
                className={rMultiple >= 0 ? "text-green-400" : "text-red-400"}
              >
                {signed(rMultiple, "R")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <StatTile
          label="Entry price"
          value={trade.contractPrice != null ? `$${trade.contractPrice}` : "-"}
        />
        <StatTile
          label="Exit price"
          value={
            isClosed && trade.closingContractPrice != null
              ? `$${trade.closingContractPrice}`
              : "-"
          }
        />
        <StatTile
          label="Change"
          value={change != null ? signed(change, "%", 0) : "-"}
          tone={change == null ? undefined : change >= 0 ? "up" : "down"}
        />
        <StatTile label="Cost basis" value={hasCost ? fmtMoneyFull(cost) : "-"} />
        <StatTile
          label="Fees"
          value={trade.fees != null ? fmtMoneyFull(trade.fees) : "-"}
        />
        <StatTile label="Held" value={heldDays != null ? `${heldDays}d` : "-"} />
        <StatTile label="Bought" value={dateStr(trade.dateBought)} />
        <StatTile label="Closed" value={dateStr(trade.dateClosed)} />
        <StatTile label="Expiry" value={dateStr(trade.expiryDate)} />
        <StatTile label="Strategy" value={trade.strategy || "-"} />
      </div>

      {/* Tags */}
      {(trade.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trade.tags!.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full text-[11px] border border-white/15 bg-white/[0.05] text-white/70"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "up" | "down";
}) {
  const color =
    tone === "up"
      ? "text-green-400"
      : tone === "down"
        ? "text-red-400"
        : "text-white/85";
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-white/40">{label}</div>
      <div
        className={`mt-0.5 text-[14px] font-medium tabular-nums truncate ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

// Read-only render of the stored notes HTML (shown when not editing). The
// notes are the user's own content, displayed back to them.
function ReadOnlyNotes({ html }: { html: string }) {
  const hasContent = !!html && html.replace(/<[^>]*>/g, "").trim().length > 0;
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="text-[11px] text-white/45 mb-2">Notes</div>
      {hasContent ? (
        <div
          className="flex-1 min-h-[40vh] md:min-h-0 overflow-y-auto thin-scroll rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[14px] leading-relaxed text-white/85 break-words [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-teal-300 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="flex-1 min-h-[40vh] md:min-h-0 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center text-[13px] text-white/35">
          No notes yet
        </div>
      )}
    </div>
  );
}

// ─── Form primitives ───────────────────────────────────────────────

// Shared compact input look for the trade-fields panel.
const INPUT_CLS =
  "w-full min-w-0 px-2.5 py-1.5 text-[13px] text-white bg-white/[0.03] rounded-lg border border-white/10 focus:border-white/25 focus:outline-none transition placeholder:text-white/30";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] text-white/45">{children}</label>
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
      className={INPUT_CLS}
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
      className={`${INPUT_CLS} appearance-none`}
    />
  );
}

function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLS} appearance-none`}
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
