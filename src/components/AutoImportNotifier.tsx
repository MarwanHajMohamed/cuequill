"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import ImportedTradesModal from "@/app/trades/ImportedTradesModal";

// Shows a small welcome pop-up on the first authenticated page load
// after the nightly IBKR sync (or any earlier session's manual sync)
// inserted rows the user hasn't acknowledged yet. Dismissing or
// opening the imported-list stamps the "seen" marker server-side so
// the notice doesn't reappear on the next navigation.

export default function AutoImportNotifier() {
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [insertedCount, setInsertedCount] = useState(0);
  const [showNotice, setShowNotice] = useState(false);
  const [showImported, setShowImported] = useState(false);

  useEffect(() => {
    // Wait until NextAuth resolves the session — status starts as
    // "loading". Bail out entirely for unauthenticated visitors so we
    // don't hit an auth-gated endpoint from the marketing page.
    if (status !== "authenticated" || checked) return;
    let cancelled = false;
    const run = async () => {
      try {
        const r = await fetch("/api/ibkr/last-sync-notice");
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        if (d.notify && d.insertedCount > 0) {
          setInsertedCount(d.insertedCount);
          setShowNotice(true);
        }
      } catch {
        // Silent failure — no notice is fine. Better to skip the
        // notice than to spam the user with an error toast.
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [status, checked]);

  const markSeen = async () => {
    try {
      await fetch("/api/ibkr/last-sync-notice", { method: "POST" });
    } catch {
      // Non-fatal — worst case the notice reappears next login.
    }
  };

  const dismiss = () => {
    setShowNotice(false);
    void markSeen();
  };

  const openImported = () => {
    setShowNotice(false);
    setShowImported(true);
    void markSeen();
  };

  return (
    <>
      <AnimatePresence>
        {showNotice && (
          <motion.div
            key="auto-import-backdrop"
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismiss}
          >
            <motion.div
              key="auto-import-card"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--surface,#141419)] shadow-[0_24px_80px_var(--shadow,rgba(0,0,0,0.6))] overflow-hidden"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="bg-gradient-to-br from-teal-500/15 via-transparent to-transparent px-5 md:px-6 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                    <i className="fa-solid fa-cloud-arrow-down text-teal-300 text-[13px]" />
                  </div>
                  <span className="text-[10px] tracking-[0.12em] text-teal-300 font-semibold">
                    AUTO-SYNC
                  </span>
                </div>
                <div className="text-lg md:text-xl font-semibold tracking-tight">
                  {insertedCount === 1
                    ? "1 new trade imported"
                    : `${insertedCount} new trades imported`}
                </div>
                <div className="mt-1.5 text-[12.5px] text-white/55 leading-snug">
                  Your IBKR account synced automatically overnight while you
                  were away.
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 md:px-6 py-3 md:py-4">
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 inline-flex items-center justify-center py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={openImported}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/40 hover:bg-teal-500/30 transition text-[13px] font-semibold cursor-pointer"
                >
                  <i className="fa-solid fa-list-check text-[11px]" />
                  See what changed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showImported && (
        <ImportedTradesModal
          onClose={() => setShowImported(false)}
          onDeleted={() => {
            // Any delete from the review modal should refresh the
            // trades table if the user has it open in another tab
            // area.
            if (session?.user?.id) {
              queryClient.invalidateQueries({
                queryKey: ["trades", session.user.id],
              });
            }
          }}
        />
      )}
    </>
  );
}
