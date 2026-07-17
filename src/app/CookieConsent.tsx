"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

// Lightweight cookie notice. Cuequill only sets cookies that are strictly
// necessary (keeping you signed in) — no advertising or tracking cookies —
// so this is an acknowledgement, not a granular opt-in. The acknowledgement
// is stored in localStorage (not a cookie) so the notice itself needs no
// consent. If tracking/analytics cookies are ever added, this should be
// upgraded to a proper consent manager with per-category opt-in.
const STORAGE_KEY = "cuequill:cookie-consent:v1";

export default function CookieConsent() {
  // Start hidden; only decide to show after mount so we don't flash the
  // banner before reading localStorage (and to avoid hydration mismatch).
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      /* localStorage unavailable — just don't show it */
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          role="region"
          aria-label="Cookie notice"
          className="fixed z-[70] left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] md:left-6 md:right-auto md:max-w-sm rounded-2xl border border-white/10 bg-[var(--surface-2)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-3"
        >
          <div className="flex items-start gap-2.5">
            <i className="fa-solid fa-cookie-bite text-teal-300 text-[14px] mt-0.5" />
            <p className="text-[12.5px] leading-relaxed text-white/70">
              We use only the cookies needed to keep you signed in and run
              Cuequill — no ads or tracking. See our{" "}
              <Link
                href="/privacy"
                className="text-teal-300 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={accept}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[12.5px] font-medium cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
