"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

// Small delete-confirmation dialog for the rules board. Matches the app's
// existing confirm modal (surface card, red warning icon, Cancel / Delete),
// minus the "type delete" step - overkill for a single rule or section.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5 bg-[var(--surface)] border border-white/10 items-center p-6 md:p-7 rounded-2xl w-full max-w-sm text-white text-center shadow-[0_20px_80px_var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation text-red-300 text-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">{title}</div>
              <div className="text-[13px] text-white/55 leading-relaxed">
                {message}
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition cursor-pointer text-[13px]"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                autoFocus
                className="flex-1 px-4 py-2 rounded-full border border-red-500/25 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition cursor-pointer text-[13px] font-medium"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
