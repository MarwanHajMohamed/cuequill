"use client";

import { withAuth } from "@/lib/withAuth";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";

type Rule = { id: string; title: string; body?: string };
type Section = { id: string; title: string; rules: Rule[] };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const toast = useToast();

  const [sections, setSections] = useState<Section[] | null>(null);
  const [editMode, setEditMode] = useState(false);
  const sectionsRef = useRef<Section[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/rules?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        const s: Section[] = Array.isArray(d?.sections) ? d.sections : [];
        sectionsRef.current = s;
        setSections(s);
      })
      .catch(() => setSections([]));
  }, [userId]);

  const persist = useCallback(
    async (next: Section[]) => {
      if (!userId) return;
      try {
        const res = await fetch("/api/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, sections: next }),
        });
        if (!res.ok) throw new Error("Request failed");
      } catch {
        toast("Failed to save changes");
      }
    },
    [userId, toast]
  );

  // Apply a structural change optimistically, then save the whole board.
  // sectionsRef keeps us off stale closures when changes land in quick
  // succession.
  const commit = useCallback(
    (producer: (prev: Section[]) => Section[]) => {
      const next = producer(sectionsRef.current);
      sectionsRef.current = next;
      setSections(next);
      persist(next);
    },
    [persist]
  );

  // ── Section ops ───────────────────────────────────────────────────────
  const addSection = () =>
    commit((prev) => [...prev, { id: uid(), title: "New section", rules: [] }]);

  const renameSection = (id: string, title: string) =>
    commit((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));

  const deleteSection = (id: string) =>
    commit((prev) => prev.filter((s) => s.id !== id));

  const moveSection = (id: string, dir: -1 | 1) =>
    commit((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // ── Rule ops ──────────────────────────────────────────────────────────
  const addRule = (sectionId: string, title: string, body: string) =>
    commit((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, rules: [...s.rules, { id: uid(), title, body }] }
          : s
      )
    );

  const editRule = (
    sectionId: string,
    ruleId: string,
    title: string,
    body: string
  ) =>
    commit((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              rules: s.rules.map((r) =>
                r.id === ruleId ? { ...r, title, body } : r
              ),
            }
          : s
      )
    );

  const deleteRule = (sectionId: string, ruleId: string) =>
    commit((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, rules: s.rules.filter((r) => r.id !== ruleId) }
          : s
      )
    );

  const moveRule = (sectionId: string, ruleId: string, dir: -1 | 1) =>
    commit((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const i = s.rules.findIndex((r) => r.id === ruleId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.rules.length) return s;
        const rules = [...s.rules];
        [rules[i], rules[j]] = [rules[j], rules[i]];
        return { ...s, rules };
      })
    );

  const moveRuleToSection = (
    fromId: string,
    ruleId: string,
    toId: string
  ) =>
    commit((prev) => {
      if (fromId === toId) return prev;
      const rule = prev
        .find((s) => s.id === fromId)
        ?.rules.find((r) => r.id === ruleId);
      if (!rule) return prev;
      return prev.map((s) => {
        if (s.id === fromId)
          return { ...s, rules: s.rules.filter((r) => r.id !== ruleId) };
        if (s.id === toId) return { ...s, rules: [...s.rules, rule] };
        return s;
      });
    });

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      {/* HERO */}
      <div className="w-full max-w-[1100px] mt-30 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Playbook
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Rules & timeframes
            </span>
          </h1>
        </motion.div>

        {/* Sections */}
        {sections === null ? (
          <div className="mt-10 text-center text-[13px] text-white/40">
            Loading…
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
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
              <AnimatePresence initial={false}>
                {sections.map((section, i) => (
                  <SectionCard
                    key={section.id}
                    editMode={editMode}
                    section={section}
                    isFirst={i === 0}
                    isLast={i === sections.length - 1}
                    otherSections={sections
                      .filter((s) => s.id !== section.id)
                      .map((s) => ({ id: s.id, title: s.title }))}
                    onRename={(title) => renameSection(section.id, title)}
                    onDelete={() => deleteSection(section.id)}
                    onMove={(dir) => moveSection(section.id, dir)}
                    onAddRule={(title, body) =>
                      addRule(section.id, title, body)
                    }
                    onEditRule={(ruleId, title, body) =>
                      editRule(section.id, ruleId, title, body)
                    }
                    onDeleteRule={(ruleId) => deleteRule(section.id, ruleId)}
                    onMoveRule={(ruleId, dir) =>
                      moveRule(section.id, ruleId, dir)
                    }
                    onMoveRuleToSection={(ruleId, toId) =>
                      moveRuleToSection(section.id, ruleId, toId)
                    }
                  />
                ))}
              </AnimatePresence>
            </div>

            {editMode && (
              <button
                onClick={addSection}
                className="mt-4 md:mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition py-4 text-[13px] font-medium text-white/55 hover:text-white/80 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[11px]" />
                Add section
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section card ────────────────────────────────────────────────────────
function SectionCard({
  editMode,
  section,
  isFirst,
  isLast,
  otherSections,
  onRename,
  onDelete,
  onMove,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onMoveRule,
  onMoveRuleToSection,
}: {
  editMode: boolean;
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  otherSections: { id: string; title: string }[];
  onRename: (title: string) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddRule: (title: string, body: string) => void;
  onEditRule: (ruleId: string, title: string, body: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onMoveRule: (ruleId: string, dir: -1 | 1) => void;
  onMoveRuleToSection: (ruleId: string, toId: string) => void;
}) {
  const [title, setTitle] = useState(section.title);
  useEffect(() => setTitle(section.title), [section.title]);

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== section.title) onRename(t);
    else setTitle(section.title);
  };

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-5 md:p-7"
    >
      <div className="flex items-center gap-2 mb-5">
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
            className="flex-1 min-w-0 bg-transparent text-2xl md:text-3xl font-semibold tracking-tight text-white focus:outline-none focus:border-b focus:border-white/20"
          />
        ) : (
          <h2 className="flex-1 min-w-0 text-2xl md:text-3xl font-semibold tracking-tight text-white">
            {section.title}
          </h2>
        )}
        {editMode && (
          <div className="flex items-center gap-0.5 shrink-0">
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
        )}
      </div>

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
              onMove={(dir) => onMoveRule(rule.id, dir)}
              onMoveTo={(toId) => onMoveRuleToSection(rule.id, toId)}
              onEdit={(t, b) => onEditRule(rule.id, t, b)}
              onDelete={() => onDeleteRule(rule.id)}
            />
          ))}
        </AnimatePresence>
        {editMode && <AddRuleRow onAdd={onAddRule} />}
      </ol>
    </motion.section>
  );
}

// ─── Rule row ──────────────────────────────────────────────────────────
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

            {/* Controls - only in edit mode */}
            {editMode && (
              <div className="shrink-0 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                <IconBtn
                  label="Move up"
                  icon="fa-chevron-up"
                  disabled={isFirst}
                  onClick={() => onMove(-1)}
                />
                <IconBtn
                  label="Move down"
                  icon="fa-chevron-down"
                  disabled={isLast}
                  onClick={() => onMove(1)}
                />
                {otherSections.length > 0 && (
                  <div className="relative">
                    <IconBtn
                      label="Move to section"
                      icon="fa-right-left"
                      onClick={() => setMenuOpen((v) => !v)}
                    />
                    {menuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-white/10 bg-[var(--surface)] shadow-[0_20px_80px_rgba(0,0,0,0.6)] p-1">
                          <div className="px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/35 font-medium">
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
                  label="Edit rule"
                  icon="fa-pen"
                  onClick={() => setEditing(true)}
                />
                <IconBtn
                  label="Delete rule"
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

// ─── Inline add-rule row ─────────────────────────────────────────────────
function AddRuleRow({ onAdd }: { onAdd: (title: string, body: string) => void }) {
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
          placeholder="Add a rule…"
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
              Save
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Small icon button ───────────────────────────────────────────────────
function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition cursor-pointer disabled:opacity-25 disabled:cursor-default ${
        danger
          ? "text-white/40 hover:text-red-400 hover:bg-white/[0.06]"
          : "text-white/50 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      <i className={`fa-solid ${icon}`} />
    </button>
  );
}

export default withAuth(Page);
