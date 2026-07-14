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

  const section = sections?.find((s) => s.id === id) ?? null;
  const otherSections =
    sections
      ?.filter((s) => s.id !== id)
      .map((s) => ({ id: s.id, title: s.title })) ?? [];

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-20">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1100px] mt-25 md:mt-10 px-5 md:px-10">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/rules"
              prefetch
              aria-label="back to rules"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition"
            >
              <i className="fa-solid fa-chevron-left text-[10px]" />
            </Link>
            <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium">
              Playbook
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                {sections === null
                  ? "Loading…"
                  : (section?.title ?? "Section not found")}
              </span>
            </h1>
            {section && (
              <div className="text-[12px] text-white/45 tabular-nums">
                {section.rules.length} rule
                {section.rules.length === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </motion.div>

        {sections === null ? null : !section ? (
          <div className="mt-10 text-center text-[13px] text-white/40">
            This section no longer exists.
          </div>
        ) : (
          <>
            <div className="mt-8 md:mt-10 flex justify-end">
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

            <motion.section
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-5 md:p-7"
            >
              <ol className="flex flex-col gap-3 md:gap-4">
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
                    onAdd={(t, b) => addRule(section.id, t, b)}
                  />
                )}
                {!editMode && section.rules.length === 0 && (
                  <li className="text-[13px] text-white/40 text-center py-2">
                    No rules yet. Tap Edit to add one.
                  </li>
                )}
              </ol>
            </motion.section>
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
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex gap-4"
    >
      <div className="shrink-0 w-8 h-8 rounded-lg border bg-teal-500/10 border-teal-500/25 text-teal-300 flex items-center justify-center text-[12px] font-semibold tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
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
              className="w-full bg-transparent text-[14px] md:text-[15px] font-medium text-white border-b border-white/15 focus:outline-none focus:border-white/30 pb-0.5"
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[14px] md:text-[15px] font-medium text-white">
                {rule.title}
              </div>
              {rule.body && (
                <div className="text-[13px] md:text-[14px] text-white/55 leading-relaxed mt-0.5">
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
  onAdd,
}: {
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
    <li className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-lg border border-dashed border-teal-500/25 flex items-center justify-center text-white/30">
        <i className="fa-solid fa-plus text-[11px]" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
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
          placeholder="add a rule…"
          className="w-full bg-transparent text-[14px] md:text-[15px] font-medium placeholder:text-white/30 text-white focus:outline-none"
        />
        {title.trim() && (
          <div className="flex items-center gap-3 mt-1">
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
              save
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
