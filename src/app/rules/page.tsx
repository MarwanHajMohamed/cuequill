"use client";

import { withAuth } from "@/lib/withAuth";
import { Skeleton } from "@/components/Loaders";
import ProGate from "@/components/ProGate";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRulesBoard, type Section } from "./useRulesBoard";
import IconBtn from "./IconBtn";

function Page() {
  const {
    sections,
    addSection,
    renameSection,
    deleteSection,
    moveSection,
  } = useRulesBoard();
  const [editMode, setEditMode] = useState(false);

  const totalRules = useMemo(
    () => (sections ?? []).reduce((n, s) => n + s.rules.length, 0),
    [sections],
  );

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1100px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium">
              Playbook
            </div>
            <h1 className="mt-1.5 text-2xl md:text-[28px] font-semibold tracking-tight">
              Rules
            </h1>
            <p className="mt-1.5 text-[13px] md:text-sm text-white/55 max-w-xl">
              Your trading rules, grouped into sections you can open, reorder
              and refine.
            </p>
          </div>

          {sections !== null && (
            <div className="flex items-center gap-2">
              {sections.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[11.5px] text-white/55 tabular-nums">
                  {sections.length} section{sections.length === 1 ? "" : "s"}
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  {totalRules} rule{totalRules === 1 ? "" : "s"}
                </span>
              )}
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[12px] font-medium transition cursor-pointer ${
                  editMode
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                    : "bg-white/[0.03] text-white/65 border-white/10 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <i
                  className={`fa-solid ${
                    editMode ? "fa-check" : "fa-pen"
                  } text-[10px]`}
                />
                {editMode ? "Done" : "Edit"}
              </button>
            </div>
          )}
        </div>

        {sections === null ? (
          <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[150px] rounded-2xl"
                delay={i * 0.06}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <AnimatePresence initial={false}>
                {sections.map((section, i) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    index={i}
                    editMode={editMode}
                    isFirst={i === 0}
                    isLast={i === sections.length - 1}
                    onRename={(t) => renameSection(section.id, t)}
                    onDelete={() => deleteSection(section.id)}
                    onMove={(dir) => moveSection(section.id, dir)}
                  />
                ))}
              </AnimatePresence>

              {editMode && (
                <button
                  onClick={addSection}
                  className="min-h-[150px] flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition text-[13px] font-medium text-white/55 hover:text-white/80 cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center">
                    <i className="fa-solid fa-plus text-[12px]" />
                  </span>
                  Add section
                </button>
              )}
            </div>

            {sections.length === 0 && !editMode && (
              <div className="mt-10 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-12 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl border border-teal-500/25 bg-teal-500/10 text-teal-300 flex items-center justify-center">
                  <i className="fa-solid fa-list-check text-[18px]" />
                </div>
                <div className="max-w-sm">
                  <h2 className="text-[16px] font-semibold">
                    Build your playbook
                  </h2>
                  <p className="text-[13px] text-white/55 mt-1.5 leading-relaxed">
                    Group your trading rules into sections — entries, risk,
                    psychology — and keep them a tap away.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditMode(true);
                    addSection();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-[11px]" />
                  Add your first section
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  index,
  editMode,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMove,
}: {
  section: Section;
  index: number;
  editMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [title, setTitle] = useState(section.title);
  useEffect(() => setTitle(section.title), [section.title]);

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== section.title) onRename(t);
    else setTitle(section.title);
  };

  const count = section.rules.length;
  const preview = section.rules.slice(0, 3);

  const badge = (
    <div className="shrink-0 w-9 h-9 rounded-lg border bg-teal-500/10 border-teal-500/25 text-teal-300 flex items-center justify-center text-[12px] font-semibold tabular-nums">
      {String(index + 1).padStart(2, "0")}
    </div>
  );

  const header = (
    <div className="flex items-center gap-3">
      {badge}
      <div className="flex-1 min-w-0">
        {editMode ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setTitle(section.title);
                e.currentTarget.blur();
              }
            }}
            className="w-full bg-transparent text-[14px] md:text-[15px] font-medium tracking-tight text-white focus:outline-none border-b border-transparent focus:border-white/20 pb-0.5"
          />
        ) : (
          <div className="text-[14px] md:text-[15px] font-medium tracking-tight truncate">
            {section.title}
          </div>
        )}
        <div className="text-[11px] text-white/45 mt-0.5 tabular-nums">
          {count} rule{count === 1 ? "" : "s"}
        </div>
      </div>
      {editMode ? (
        <div className="shrink-0 flex items-center gap-0.5">
          <IconBtn
            label="Move section up"
            icon="fa-chevron-up"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          />
          <IconBtn
            label="Move section down"
            icon="fa-chevron-down"
            disabled={isLast}
            onClick={() => onMove(1)}
          />
          <IconBtn
            label="Delete section"
            icon="fa-trash-can"
            danger
            onClick={onDelete}
          />
        </div>
      ) : (
        <i className="fa-solid fa-chevron-right text-[12px] text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition" />
      )}
    </div>
  );

  // Preview of the first few rules, shown in view mode so each card is
  // useful at a glance without opening the section.
  const previewBlock = (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      {count === 0 ? (
        <div className="text-[12px] text-white/35 italic">
          No rules yet
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {preview.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2.5 text-[12.5px] text-white/60 min-w-0"
            >
              <span className="w-1 h-1 rounded-full bg-teal-400/70 shrink-0" />
              <span className="truncate">{r.title}</span>
            </li>
          ))}
          {count > preview.length && (
            <li className="text-[11.5px] text-white/35 pl-[18px] tabular-nums">
              +{count - preview.length} more
            </li>
          )}
        </ul>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {editMode ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {header}
          {previewBlock}
        </div>
      ) : (
        <Link
          href={`/rules/${section.id}`}
          prefetch
          className="group block h-full rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition p-5"
        >
          {header}
          {previewBlock}
        </Link>
      )}
    </motion.div>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Rules board"
      description="Your trading rules and section structure, saved across devices. Available on Pro."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
