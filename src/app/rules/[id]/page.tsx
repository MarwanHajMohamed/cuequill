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

      <div className="w-full max-w-[860px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Link
            href="/rules"
            prefetch
            className="inline-flex items-center gap-2 text-[12px] text-white/45 hover:text-white/80 transition group w-fit"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-white/[0.03] group-hover:bg-white/[0.06] group-hover:-translate-x-0.5 transition">
              <i className="fa-solid fa-chevron-left text-[10px]" />
            </span>
            <span className="tracking-[0.08em]">Playbook</span>
          </Link>

          <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[26px] md:text-[34px] font-semibold tracking-tight leading-[1.05] text-white">
                {sections === null
                  ? "Loading…"
                  : (section?.title ?? "Section not found")}
              </h1>
              {section && (
                <div className="mt-2 flex items-center gap-2.5 text-[12px] text-white/45">
                  <span className="tabular-nums">
                    {section.rules.length} rule
                    {section.rules.length === 1 ? "" : "s"}
                  </span>
                  {sections && sections.length > 1 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="tabular-nums">
                        Section {index + 1} of {sections.length}
                      </span>
                    </>
                  )}
                </div>
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
        </motion.div>

        {sections === null ? null : !section ? (
          <div className="mt-14 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-10 text-center text-[13px] text-white/45">
            This section no longer exists.
          </div>
        ) : (
          <>
            <ol className="mt-7 md:mt-8 flex flex-col gap-3">
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
              {!editMode && section.rules.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-10 text-center">
                  <div className="text-[13px] text-white/55">
                    No rules in this section yet.
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-teal-300 hover:text-teal-200 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-[10px]" />
                    Add your first rule
                  </button>
                </li>
              )}
            </ol>

            {/* Prev / next section navigation */}
            {(prev || next) && !editMode && (
              <nav className="mt-10 grid grid-cols-2 gap-3">
                {prev ? (
                  <SectionNavLink dir="prev" section={prev} />
                ) : (
                  <span />
                )}
                {next ? (
                  <SectionNavLink dir="next" section={next} />
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Prev / next section jump card at the foot of a section page.
function SectionNavLink({
  dir,
  section,
}: {
  dir: "prev" | "next";
  section: { id: string; title: string; rules: Rule[] };
}) {
  const isNext = dir === "next";
  return (
    <Link
      href={`/rules/${section.id}`}
      prefetch
      className={`group rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition px-4 py-3 flex flex-col gap-0.5 ${
        isNext ? "items-end text-right" : "items-start"
      }`}
    >
      <span className="text-[10.5px] tracking-[0.1em] text-white/40 inline-flex items-center gap-1.5">
        {!isNext && (
          <i className="fa-solid fa-arrow-left text-[9px] group-hover:-translate-x-0.5 transition" />
        )}
        {isNext ? "Next" : "Previous"}
        {isNext && (
          <i className="fa-solid fa-arrow-right text-[9px] group-hover:translate-x-0.5 transition" />
        )}
      </span>
      <span className="text-[13.5px] font-medium text-white/85 truncate max-w-full">
        {section.title}
      </span>
    </Link>
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
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md hover:border-white/[0.16] transition overflow-hidden"
    >
      <div className="flex gap-4 md:gap-5 px-5 py-4 md:px-6 md:py-5">
        {/* Accent index */}
        <div className="shrink-0 w-8 md:w-9 pt-0.5 text-right">
          <span className="text-[22px] md:text-[26px] font-semibold tabular-nums leading-none bg-gradient-to-b from-teal-200 to-teal-500 bg-clip-text text-transparent">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {editing && editMode ? (
            <div className="flex flex-col gap-1.5">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="Rule"
                className="w-full bg-transparent text-[15px] md:text-[16px] font-medium text-white border-b border-white/15 focus:outline-none focus:border-teal-400/50 pb-1"
              />
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="Optional detail…"
                className="w-full bg-transparent text-[13px] md:text-[14px] text-white/70 focus:outline-none py-0.5"
              />
              <div className="flex gap-3 mt-1">
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 pt-0.5">
                <div className="text-[15px] md:text-[16px] font-medium text-white leading-snug">
                  {rule.title}
                </div>
                {rule.body && (
                  <div className="text-[13px] md:text-[14px] text-white/55 leading-relaxed mt-1">
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
    <li className="rounded-2xl border border-dashed border-teal-500/25 bg-teal-500/[0.03] px-5 py-4 md:px-6 md:py-5">
      <div className="flex gap-4 md:gap-5">
        <div className="shrink-0 w-8 md:w-9 pt-0.5 text-right">
          <span className="text-[22px] md:text-[26px] font-semibold tabular-nums leading-none text-white/20">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
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
            className="w-full bg-transparent text-[15px] md:text-[16px] font-medium placeholder:text-white/30 text-white focus:outline-none"
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
