"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

type NotesModalProps = {
  onClose: () => void;
  onSave: (newNotes: string, tradeId: string) => void;
  notes: string;
  tradeId?: string;
};

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? "⌘" : "Ctrl";

export default function NotesModal({
  onClose,
  onSave,
  notes,
  tradeId,
}: NotesModalProps) {
  const [value, setValue] = useState(notes);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const dirty = value !== notes;
  const canSave = !!tradeId && dirty;

  const wordCount = useMemo(
    () => (value.trim() ? value.trim().split(/\s+/).length : 0),
    [value],
  );
  const charCount = value.length;

  const handleSave = () => {
    if (!canSave || !tradeId) return;
    onSave(value, tradeId);
    onClose();
  };

  // Autofocus on open + place cursor at end (so editing an existing
  // note doesn't reset the caret).
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }, []);

  // Keybindings: Esc closes, ⌘/Ctrl+Enter saves (skip if textarea hasn't
  // been touched - prevents accidental empty-save).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, value, tradeId]);

  return (
    <AnimatePresence>
      <motion.div
        key="notes-backdrop"
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
      >
        <motion.div
          key="notes-card"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 md:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-300 flex items-center justify-center">
                <i className="fa-solid fa-book-open text-[13px]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium">
                  Trade journal
                </div>
                <div className="text-[15px] md:text-base font-semibold tracking-tight">
                  <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                    Notes
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-[13px]" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 md:px-6 pt-5 pb-3">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={10}
              spellCheck
              className="w-full p-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-[14px] text-white/90 placeholder:text-white/30 resize-none leading-relaxed transition"
              placeholder={`What did you see? What did you miss?\n\nWhat would you do differently next time?`}
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/35 tabular-nums">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[10px] text-white/55 font-sans">
                    {modKey}
                  </kbd>
                  <span className="text-white/30">+</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[10px] text-white/55 font-sans">
                    ↵
                  </kbd>
                  <span className="text-white/40 normal-case">to save</span>
                </span>
                <span className="text-white/15">·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[10px] text-white/55 font-sans">
                    Esc
                  </kbd>
                  <span className="text-white/40">to cancel</span>
                </span>
              </div>
              <div className="text-white/40">
                {wordCount} word{wordCount === 1 ? "" : "s"} ·{" "}
                {charCount.toLocaleString()} char
                {charCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 md:px-6 pb-5 pt-2 flex items-center justify-between gap-2">
            <div className="text-[11px] text-white/40">
              {dirty ? (
                <span className="text-amber-300/80 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-white/40">
                  <i className="fa-solid fa-check text-[10px] text-teal-400/80" />
                  Up to date
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                type="button"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
                  canSave
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                    : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                }`}
              >
                <i className="fa-solid fa-check text-[11px]" />
                Save
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
