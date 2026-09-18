"use client";

import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import React, { use, useEffect, useState } from "react";
import { useRulesBoard, type Rule } from "../useRulesBoard";
import IconBtn from "../IconBtn";

function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    sections,
    addRule,
    editRule,
    deleteRule,
    moveRule,
    moveRuleToSection,
  } = useRulesBoard();
  const [editMode, setEditMode] = useState(false);

  const index = sections?.findIndex((s) => s.id === id) ?? -1;
  const section = index >= 0 ? sections![index] : null;
  const prev = sections && index > 0 ? sections[index - 1] : null;
  const next =
    sections && index >= 0 && index < sections.length - 1
      ? sections[index + 1]
      : null;
  const otherSections =
    sections
      ?.filter((s) => s.id !== id)
      .map((s) => ({ id: s.id, title: s.title })) ?? [];

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
        <Link
          href="/rules"
          prefetch
          className="inline-flex items-center gap-1.5 text-[12.5px] text-white/45 hover:text-white/80 transition w-fit"
        >
          <i className="fa-solid fa-chevron-left text-[9px]" />
          Rules
        </Link>

        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight">
              {sections === null
                ? "Loading…"
                : (section?.title ?? "Section not found")}
            </h1>
            {section && (
              <p className="mt-1.5 text-[13px] md:text-sm text-white/55 tabular-nums">
                {section.rules.length} rule
                {section.rules.length === 1 ? "" : "s"}
                {sections && sections.length > 1
                  ? ` · Section ${index + 1} of ${sections.length}`
                  : ""}
              </p>
            )}
          </div>

          {section && (
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

        {sections === null ? null : !section ? (
          <div className="mt-12 text-[13px] text-white/40">
            This section no longer exists.
          </div>
        ) : (
          <>
            {section.rules.length === 0 && !editMode ? (
              <div className="mt-8 text-[13px] text-white/45">
                No rules in this section yet.{" "}
                <button
                  onClick={() => setEditMode(true)}
                  className="text-teal-300 hover:text-teal-200 transition cursor-pointer"
                >
                  Add one
                </button>
                .
              </div>
            ) : (
              <ol className="mt-7 md:mt-8 border-t border-white/[0.08]">
                <AnimatePresence initial={false}>
                  {section.rules.map((rule, i) => (
                    <RuleRow
                      key={rule.id}
                      editMode={editMode}
                      index={i}
                      rule={rule}
                      isFirst={i === 0}
                      isLast={i === section.rules.length - 1}
                      otherSections={otherSections}
                      onMove={(dir) => moveRule(section.id, rule.id, dir)}
                      onMoveTo={(toId) =>
                        moveRuleToSection(section.id, rule.id, toId)
                      }
                      onEdit={(t, b) => editRule(section.id, rule.id, t, b)}
                      onDelete={() => deleteRule(section.id, rule.id)}
                    />
                  ))}
                </AnimatePresence>
                {editMode && (
                  <AddRuleRow
                    index={section.rules.length}
                    onAdd={(t, b) => addRule(section.id, t, b)}
                  />
                )}
              </ol>
            )}

            {/* Prev / next section - understated text links */}
            {(prev || next) && !editMode && (
              <div className="mt-10 flex items-center justify-between gap-4 text-[12.5px]">
                {prev ? (
                  <Link
                    href={`/rules/${prev.id}`}
                    prefetch
                    className="group inline-flex items-center gap-2 text-white/50 hover:text-white transition min-w-0"
                  >
                    <i className="fa-solid fa-chevron-left text-[9px] group-hover:-translate-x-0.5 transition" />
                    <span className="truncate">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link
                    href={`/rules/${next.id}`}
                    prefetch
                    className="group inline-flex items-center gap-2 text-white/50 hover:text-white transition min-w-0 justify-end text-right"
                  >
                    <span className="truncate">{next.title}</span>
                    <i className="fa-solid fa-chevron-right text-[9px] group-hover:translate-x-0.5 transition" />
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  editMode,
  index,
  rule,
  isFirst,
  isLast,
  otherSections,
  onMove,
  onMoveTo,
  onEdit,
  onDelete,
}: {
  editMode: boolean;
  index: number;
  rule: Rule;
  isFirst: boolean;
  isLast: boolean;
  otherSections: { id: string; title: string }[];
  onMove: (dir: -1 | 1) => void;
  onMoveTo: (toId: string) => void;
  onEdit: (title: string, body: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rule.title);
  const [body, setBody] = useState(rule.body ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTitle(rule.title);
    setBody(rule.body ?? "");
  }, [rule.title, rule.body]);

  const save = () => {
    const t = title.trim();
    if (!t) {
      setTitle(rule.title);
      setBody(rule.body ?? "");
      setEditing(false);
      return;
    }
    onEdit(t, body.trim());
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group flex gap-4 md:gap-5 py-4 md:py-5 border-b border-white/[0.08]"
    >
      <span className="shrink-0 w-6 text-[13px] text-white/30 tabular-nums pt-0.5">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        {editing && editMode ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="Rule"
              className="w-full bg-transparent text-[14px] md:text-[15px] font-medium text-white border-b border-white/15 focus:outline-none focus:border-teal-400/50 pb-1"
            />
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="Optional detail…"
              className="w-full bg-transparent text-[13px] md:text-[14px] text-white/70 focus:outline-none"
            />
            <div className="flex gap-3 mt-0.5">
              <button
                onClick={save}
                className="text-xs text-teal-300 hover:text-teal-200 transition cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-white/40 hover:text-white/70 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] md:text-[15px] font-medium text-white leading-snug">
                {rule.title}
              </div>
              {rule.body && (
                <div className="text-[13px] md:text-[14px] text-white/55 leading-relaxed mt-1 max-w-3xl">
                  {rule.body}
                </div>
              )}
            </div>

            {editMode && (
              <div className="shrink-0 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                <IconBtn
                  label="move up"
                  icon="fa-chevron-up"
                  disabled={isFirst}
                  onClick={() => onMove(-1)}
                />
                <IconBtn
                  label="move down"
                  icon="fa-chevron-down"
                  disabled={isLast}
                  onClick={() => onMove(1)}
                />
                {otherSections.length > 0 && (
                  <div className="relative">
                    <IconBtn
                      label="move to section"
                      icon="fa-right-left"
                      onClick={() => setMenuOpen((v) => !v)}
                    />
                    {menuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-white/10 bg-[var(--surface)] shadow-[0_20px_80px_var(--shadow)] p-1">
                          <div className="px-2 py-1 text-[10px] tracking-[0.08em] text-white/35 font-medium">
                            Move to
                          </div>
                          {otherSections.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                onMoveTo(s.id);
                                setMenuOpen(false);
                              }}
                              className="w-full text-left px-2 py-1.5 rounded-lg text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white transition cursor-pointer truncate"
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <IconBtn
                  label="edit rule"
                  icon="fa-pen"
                  onClick={() => setEditing(true)}
                />
                <IconBtn
                  label="delete rule"
                  icon="fa-xmark"
                  danger
                  onClick={onDelete}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}

function AddRuleRow({
  index,
  onAdd,
}: {
  index: number;
  onAdd: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const save = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), body.trim());
    setTitle("");
    setBody("");
  };

  return (
    <li className="flex gap-4 md:gap-5 py-4 md:py-5 border-b border-white/[0.08]">
      <span className="shrink-0 w-6 text-[13px] text-white/25 tabular-nums pt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setTitle("");
              setBody("");
            }
          }}
          placeholder="Add a rule…"
          className="w-full bg-transparent text-[14px] md:text-[15px] font-medium placeholder:text-white/30 text-white focus:outline-none"
        />
        {title.trim() && (
          <div className="flex items-center gap-3 mt-1.5">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setTitle("");
                  setBody("");
                }
              }}
              placeholder="Optional detail…"
              className="flex-1 bg-transparent text-[13px] md:text-[14px] placeholder:text-white/25 text-white/70 focus:outline-none"
            />
            <button
              onClick={save}
              className="shrink-0 text-xs text-teal-300 hover:text-teal-200 transition cursor-pointer"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function GatedPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ProGate
      feature="Rules board"
      description="Your trading rules and section structure, saved across devices. Available on Pro."
      className="min-h-screen"
    >
      <Page {...props} />
    </ProGate>
  );
}

export default withAuth(GatedPage);
