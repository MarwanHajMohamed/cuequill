"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import SchematicEditor, { type Schematic } from "@/components/SchematicEditor";
import { fetchStrategy, type StrategyDoc } from "@/hooks/useStrategies";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/Loaders";

type Direction = "CALL" | "PUT";

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
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDirection(data.direction);
      setTimeframes(data.timeframes);
      setDescription(data.description);
      setTags(data.tags);
      setSchematic(data.schematic);
    }
  }, [data]);

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
      }) !==
      JSON.stringify({
        name: data.name,
        direction: data.direction,
        timeframes: data.timeframes,
        description: data.description,
        tags: data.tags,
        schematic: data.schematic,
      })
    );
  }, [data, name, direction, timeframes, description, tags, schematic]);

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
    } catch {
      toast("Save failed");
    } finally {
      setSaving(false);
    }
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
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Strategy name"
          className="flex-1 min-w-0 p-2 text-[18px] md:text-[20px] font-semibold text-white bg-transparent rounded border border-transparent focus:border-white/15 focus:outline-none placeholder:text-white/30"
        />
        <DirectionToggle value={direction} onChange={setDirection} />
      </div>

      {/* Editor canvas */}
      <SchematicEditor value={schematic} onChange={setSchematic} />

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
        <Field label="Description" className="md:col-span-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Explain the setup, entry triggers, invalidation, and exit rules."
            className="w-full p-3 text-[13px] text-white bg-white/[0.03] rounded border border-white/10 focus:border-white/30 focus:outline-none placeholder:text-white/30 resize-y leading-relaxed"
          />
        </Field>
      </div>

      {/* Actions */}
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
          <Link
            href="/strategies"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] font-medium cursor-pointer"
          >
            Cancel
          </Link>
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
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

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
      <span className="text-[10.5px] tracking-[0.12em] uppercase text-white/45">
        {label}
      </span>
      {children}
    </div>
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
