"use client";

import { withAuth } from "@/lib/withAuth";
import { Skeleton } from "@/components/Loaders";
import ProGate from "@/components/ProGate";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRulesBoard, type Section } from "./useRulesBoard";
import IconBtn from "./IconBtn";
import ConfirmDialog from "./ConfirmDialog";

function Page() {
  const {
    sections,
    addSection,
    renameSection,
    deleteSection,
    moveSection,
  } = useRulesBoard();
  const [editMode, setEditMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    count: number;
  } | null>(null);

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

      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight">
              Rules
            </h1>
            <p className="mt-1.5 text-[13px] md:text-sm text-white/55 max-w-xl">
              Your trading rules, grouped into sections.
            </p>
          </div>

          {sections !== null && (
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
          )}
        </div>

        {sections === null ? (
          <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" delay={i * 0.05} />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence initial={false}>
                {sections.map((section, i) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    editMode={editMode}
                    isFirst={i === 0}
                    isLast={i === sections.length - 1}
                    onRename={(t) => renameSection(section.id, t)}
                    onDelete={() =>
                      setPendingDelete({
                        id: section.id,
                        title: section.title,
                        count: section.rules.length,
                      })
                    }
                    onMove={(dir) => moveSection(section.id, dir)}
                  />
                ))}
              </AnimatePresence>

              {editMode && (
                <button
                  onClick={addSection}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition px-5 py-4 text-[13px] font-medium text-white/55 hover:text-white/80 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-[11px]" />
                  Add section
                </button>
              )}
            </div>

            {sections.length === 0 && !editMode && (
              <div className="mt-8 text-[13px] text-white/45">
                No sections yet.{" "}
                <button
                  onClick={() => {
                    setEditMode(true);
                    addSection();
                  }}
                  className="text-teal-300 hover:text-teal-200 transition cursor-pointer"
                >
                  Add your first one
                </button>
                .
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete section?"
        message={
          <>
            &ldquo;{pendingDelete?.title}&rdquo;
            {pendingDelete && pendingDelete.count > 0
              ? ` and its ${pendingDelete.count} rule${
                  pendingDelete.count === 1 ? "" : "s"
                }`
              : ""}{" "}
            will be removed. This can&apos;t be undone.
          </>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSection(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function SectionCard({
  section,
  editMode,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMove,
}: {
  section: Section;
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

  const inner = (
    <div className="flex items-center gap-4 px-5 py-4">
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
        <i className="fa-solid fa-chevron-right text-[12px] text-white/35 group-hover:text-white/70 group-hover:translate-x-0.5 transition" />
      )}
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {editMode ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02]">
          {inner}
        </div>
      ) : (
        <Link
          href={`/rules/${section.id}`}
          prefetch
          className="group block rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition"
        >
          {inner}
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
