"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import SchematicEditor, {
  SchematicPlayer,
  type Schematic,
} from "@/components/SchematicEditor";
import RichNotesEditor from "@/components/RichNotesEditor";
import { fetchStrategy, type StrategyDoc } from "@/hooks/useStrategies";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/Loaders";
import { fileToDownscaledDataUrl } from "@/lib/imageDataUrl";
import type { StrategyExample, ExampleOutcome } from "@/lib/strategySeed";
import StrategyStats from "./StrategyStats";

type Direction = "CALL" | "PUT";
type Mode = "view" | "edit";

// Generate a client-side id for newly uploaded examples. crypto.randomUUID
// is available in all browsers the app targets; fall back just in case.
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError } = useQuery<StrategyDoc>({
    queryKey: ["strategy", id],
    queryFn: () => fetchStrategy(id),
    enabled: !!id,
  });

  const [mode, setMode] = useState<Mode>("view");
  // The read-only animation canvas can be retracted to a small thumbnail.
  const [canvasExpanded, setCanvasExpanded] = useState(true);
  // Tracks whether the edit buffer has been seeded from the loaded doc.
  const hydrated = useRef(false);

  // Open straight in edit mode when arrived via "?edit=1" (e.g. just
  // created from the strategies page).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit") === "1") {
      setMode("edit");
    }
  }, []);

  // Local edit buffer mirroring the loaded strategy. Save commits.
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<Direction>("CALL");
  const [timeframes, setTimeframes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [schematic, setSchematic] = useState<Schematic>({
    width: 800,
    height: 480,
    elements: [],
  });
  const [examples, setExamples] = useState<StrategyExample[]>([]);
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  // Hydrate the edit buffer from the loaded doc. Runs on load and again
  // whenever we re-sync (e.g. after a save invalidates the query).
  const hydrate = (d: StrategyDoc) => {
    setName(d.name);
    setDirection(d.direction);
    setTimeframes(d.timeframes);
    setDescription(d.description);
    setTags(d.tags);
    setSchematic(d.schematic);
    setExamples(d.examples ?? []);
  };

  useEffect(() => {
    if (!data) return;
    // Seed the buffer on first load (even if we open in edit mode), then
    // only re-sync in view mode so a background refetch doesn't clobber
    // an in-progress edit; Cancel/Save re-sync explicitly.
    if (!hydrated.current || mode === "view") {
      hydrate(data);
      hydrated.current = true;
    }
  }, [data, mode]);

  const dirty = useMemo(() => {
    if (!data) return false;
    return (
      JSON.stringify({
        name,
        direction,
        timeframes,
        description,
        tags,
        schematic,
        examples,
      }) !==
      JSON.stringify({
        name: data.name,
        direction: data.direction,
        timeframes: data.timeframes,
        description: data.description,
        tags: data.tags,
        schematic: data.schematic,
        examples: data.examples ?? [],
      })
    );
  }, [
    data,
    name,
    direction,
    timeframes,
    description,
    tags,
    schematic,
    examples,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/strategies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          direction,
          timeframes,
          description,
          tags,
          schematic,
          examples,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Save failed");
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["strategy", id] }),
        queryClient.invalidateQueries({ queryKey: ["strategies"] }),
      ]);
      toast(`${name} saved`);
      setMode("view");
    } catch {
      toast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (data) hydrate(data);
    setMode("view");
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/strategies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(j.error ?? "Delete failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast("Strategy deleted");
      router.replace("/strategies");
    } catch {
      toast("Delete failed");
    } finally {
      setSaving(false);
      setDelConfirm(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8 pt-24 pb-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8 pt-24">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 text-sm text-red-300">
          Couldn&apos;t load this strategy.
        </div>
        <Link
          href="/strategies"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-white/65 hover:text-white"
        >
          <i className="fa-solid fa-chevron-left text-[11px]" />
          Back to strategies
        </Link>
      </div>
    );
  }

  const editing = mode === "edit";

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8 pt-24 pb-6 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/strategies"
          aria-label="Back to strategies"
          className="shrink-0 inline-flex items-center justify-center text-white/55 hover:text-white transition cursor-pointer"
        >
          <i className="fa-solid fa-chevron-left text-[15px]" />
        </Link>

        {editing ? (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Strategy name"
              className="flex-1 min-w-0 p-2 text-[18px] md:text-[20px] font-semibold text-white bg-transparent rounded border border-transparent focus:border-white/15 focus:outline-none placeholder:text-white/30"
            />
            <DirectionToggle value={direction} onChange={setDirection} />
          </>
        ) : (
          <>
            <h1 className="flex-1 min-w-0 truncate p-2 text-[18px] md:text-[20px] font-semibold text-white">
              {data.name}
            </h1>
            <DirectionBadge direction={data.direction} />
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-white hover:text-white/80 transition cursor-pointer"
            >
              <i className="fa-solid fa-pen text-[11px]" />
              Edit
            </button>
          </>
        )}
      </div>

      {/* Schematic — editable canvas in edit mode, static preview in view.
          In view mode it can be retracted to a small square thumbnail. */}
      {editing ? (
        <SchematicEditor value={schematic} onChange={setSchematic} />
      ) : data.schematic.elements.length > 0 ? (
        <div className="flex items-start gap-2">
          {canvasExpanded ? (
            <div className="flex-1 min-w-0 rounded-2xl border border-white/10 overflow-hidden bg-[#0c0c11]">
              <SchematicPlayer
                schematic={data.schematic}
                className="w-full h-auto text-white"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCanvasExpanded(true)}
              title="Expand animation"
              className="w-28 h-28 shrink-0 rounded-xl border border-white/10 overflow-hidden bg-[#0c0c11] flex items-center justify-center cursor-pointer hover:border-white/25 transition"
            >
              <SchematicPlayer
                schematic={data.schematic}
                showPlay={false}
                className="w-full h-auto text-white"
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCanvasExpanded((v) => !v)}
            title={canvasExpanded ? "Collapse animation" : "Expand animation"}
            aria-label={canvasExpanded ? "Collapse animation" : "Expand animation"}
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white transition cursor-pointer"
          >
            <i
              className={`fa-solid ${
                canvasExpanded ? "fa-compress" : "fa-expand"
              } text-[11px]`}
            />
          </button>
        </div>
      ) : null}

      {editing ? (
        <>
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
            <Field label="Timeframes">
              <ChipInput
                value={timeframes}
                onChange={setTimeframes}
                placeholder="e.g. Hourly, Daily"
              />
            </Field>
            <Field label="Tags">
              <ChipInput
                value={tags}
                onChange={setTags}
                placeholder="e.g. gap, reversal"
              />
            </Field>
          </div>

          {/* Description — rich-text editor */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 flex flex-col gap-2.5">
            <span className="text-[10.5px] tracking-[0.12em] text-white/45">
              Description
            </span>
            <RichNotesEditor
              value={description}
              onChange={setDescription}
              placeholder="Explain the setup, entry triggers, invalidation, and exit rules. Use the toolbar to format text and insert charts."
              className="min-h-[220px] max-h-[60vh]"
            />
          </div>

          {/* Examples — upload + manage */}
          <ExamplesEditor value={examples} onChange={setExamples} />
        </>
      ) : (
        <>
          {/* Performance — trades tagged with this strategy, geared to
              surfacing where the setup leaks. */}
          <StrategyStats strategyName={data.name} />

          {/* Description — read-only */}
          {data.description ? (
            <DescriptionDisplay html={data.description} />
          ) : null}

          {/* Examples — read-only gallery */}
          <ExamplesGallery examples={data.examples ?? []} />

          {/* Nudge when the strategy has no content yet. */}
          {!data.description &&
            data.schematic.elements.length === 0 &&
            (data.examples?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <div className="text-[13px] text-white/50">
                  This strategy is empty.
                </div>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 transition text-[12.5px] font-medium cursor-pointer"
                >
                  <i className="fa-solid fa-pen text-[11px]" />
                  Add details
                </button>
              </div>
            )}
        </>
      )}

      {/* Actions */}
      {editing ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={() => setDelConfirm(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-red-500/25 bg-red-500/[0.08] text-red-300 hover:bg-red-500/15 transition text-[12.5px] font-medium cursor-pointer"
          >
            <i className="fa-solid fa-trash text-[11px]" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving || !name.trim()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[12.5px] font-medium ${
                dirty && !saving && name.trim()
                  ? "bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25 cursor-pointer"
                  : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
              }`}
            >
              <i className="fa-solid fa-check text-[11px]" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      ) : null}

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
              Delete this strategy? This cannot be undone.
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                className="flex-1 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
                onClick={() => setDelConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition text-[13px] font-medium cursor-pointer"
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

// ── Read-only description ─────────────────────────────────────────────
// Renders the rich-text HTML produced by RichNotesEditor. Mirrors the
// editor's inline CSS so saved content looks identical out of edit mode.
function DescriptionDisplay({ html }: { html: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
      <div
        className="strategy-desc text-[14px] text-white/85 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .strategy-desc h3 { font-size: 16px; font-weight: 600; margin: 0.6em 0 0.3em; }
        .strategy-desc ul, .strategy-desc ol { padding-left: 1.4em; margin: 0.35em 0; }
        .strategy-desc ul { list-style: disc; }
        .strategy-desc ol { list-style: decimal; }
        .strategy-desc li { margin: 0.15em 0; }
        .strategy-desc p { margin: 0.35em 0; }
        .strategy-desc img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; display: block; }
        .strategy-desc a { color: #5eead4; text-decoration: underline; }
      `}</style>
    </div>
  );
}

// ── Read-only examples gallery ────────────────────────────────────────
function ExamplesGallery({ examples }: { examples: StrategyExample[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (examples.length === 0) return null;

  const successful = examples.filter((e) => e.outcome === "Successful");
  const unsuccessful = examples.filter((e) => e.outcome === "Unsuccessful");

  const Group = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items: StrategyExample[];
    tone: "win" | "loss";
  }) =>
    items.length === 0 ? null : (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.06em] border ${
              tone === "win"
                ? "bg-green-500/15 text-green-300 border-green-500/30"
                : "bg-red-500/15 text-red-300 border-red-500/30"
            }`}
          >
            <i
              className={`fa-solid ${
                tone === "win" ? "fa-circle-check" : "fa-circle-xmark"
              } text-[9px]`}
            />
            {title}
          </span>
          <span className="text-[11px] text-white/35">{items.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((it) => (
            <figure key={it.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setLightbox(it.src)}
                className="group relative overflow-hidden rounded-lg border border-white/10 hover:border-white/25 transition cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.src}
                  alt={it.caption ?? `${it.outcome} example`}
                  className="w-full h-28 object-cover"
                  loading="lazy"
                />
              </button>
              {it.caption && (
                <figcaption className="text-[11px] text-white/50 px-0.5 leading-snug">
                  {it.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-images text-[12px] text-teal-300/80" />
        <span className="text-[10.5px] tracking-[0.12em] text-white/45">
          Examples
        </span>
      </div>
      <Group title="Successful" items={successful} tone="win" />
      <Group title="Unsuccessful" items={unsuccessful} tone="loss" />

      {lightbox && (
        <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ── Examples editor ───────────────────────────────────────────────────
function ExamplesEditor({
  value,
  onChange,
}: {
  value: StrategyExample[];
  onChange: (v: StrategyExample[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files: FileList) => {
    setBusy(true);
    try {
      const added: StrategyExample[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const src = await fileToDownscaledDataUrl(file);
        // New uploads default to Successful; re-tag per image below.
        added.push({ id: newId(), src, outcome: "Successful" });
      }
      if (added.length) onChange([...value, ...added]);
    } finally {
      setBusy(false);
    }
  };

  const update = (id: string, patch: Partial<StrategyExample>) =>
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => onChange(value.filter((e) => e.id !== id));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-images text-[12px] text-teal-300/80" />
          <span className="text-[10.5px] tracking-[0.12em] text-white/45">
            Examples
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white transition text-[11.5px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i
              className={`fa-solid ${
                busy ? "fa-circle-notch animate-spin" : "fa-upload"
              } text-[10px]`}
            />
            {busy ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <p className="text-[11.5px] text-white/45 leading-relaxed -mt-1">
        Upload chart screenshots of where this setup worked or failed, then tag
        each as successful or unsuccessful.
      </p>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[12.5px] text-white/40">
          No examples yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((ex) => (
            <div
              key={ex.id}
              className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-1.5"
            >
              <div className="relative overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ex.src}
                  alt={ex.caption ?? `${ex.outcome} example`}
                  className="w-full h-24 object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove example"
                  onClick={() => remove(ex.id)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white/80 hover:bg-red-500/80 hover:text-white transition flex items-center justify-center cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-[11px]" />
                </button>
              </div>
              {/* Outcome toggle */}
              <div className="inline-flex rounded-md border border-white/10 bg-white/[0.03] p-0.5 gap-0.5">
                {(["Successful", "Unsuccessful"] as ExampleOutcome[]).map(
                  (o) => {
                    const active = ex.outcome === o;
                    const tone =
                      o === "Successful"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300";
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => update(ex.id, { outcome: o })}
                        className={`flex-1 px-1 py-1 rounded text-[9.5px] font-semibold transition cursor-pointer ${
                          active ? tone : "text-white/45 hover:text-white"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  },
                )}
              </div>
              <input
                type="text"
                value={ex.caption ?? ""}
                onChange={(e) =>
                  update(ex.id, { caption: e.target.value || undefined })
                }
                placeholder="Caption (optional)"
                className="w-full px-2 py-1 text-[11px] text-white bg-white/[0.03] rounded border border-white/10 focus:border-white/30 focus:outline-none placeholder:text-white/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute top-4 right-4 text-white/70 hover:text-white text-xl cursor-pointer"
        onClick={onClose}
      >
        <i className="fa-solid fa-xmark" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Strategy chart"
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[90vh] rounded-lg object-contain"
      />
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10.5px] tracking-[0.12em] text-white/45">
        {label}
      </span>
      {children}
    </div>
  );
}

function DirectionBadge({ direction }: { direction: Direction }) {
  const tone =
    direction === "CALL"
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";
  return (
    <span
      className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.08em] border ${tone}`}
    >
      {direction}
    </span>
  );
}

function DirectionToggle({
  value,
  onChange,
}: {
  value: Direction;
  onChange: (d: Direction) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 gap-1 shrink-0">
      {(["CALL", "PUT"] as Direction[]).map((d) => {
        const active = d === value;
        const tone =
          d === "CALL"
            ? "bg-green-500/20 text-green-300 border-green-500/30"
            : "bg-red-500/20 text-red-300 border-red-500/30";
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.08em] border transition cursor-pointer ${
              active
                ? tone
                : "border-transparent text-white/55 hover:text-white"
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
    setInput("");
  };
  const remove = (t: string) => onChange(value.filter((v) => v !== t));
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded border border-white/10 bg-white/[0.03] focus-within:border-white/30">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-white/[0.06] border-white/15 text-white/85"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => remove(t)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-[10px]" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            if (input.trim()) {
              e.preventDefault();
              add(input);
            }
          } else if (e.key === "Backspace" && !input && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-white/35 px-1.5 py-1 outline-none"
      />
    </div>
  );
}

export default withAuth(Page);
