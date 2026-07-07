"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

// Current plan + upgrade/cancel controls. Cancellation is inline
// (small "Sure? Yes / No" swap on the same button) — no full modal
// so the panel stays quiet. On success we ask NextAuth to refresh
// the JWT so isPro flips in the UI without a full reload.

export default function PlanTab() {
  const { data: session, update } = useSession();
  const isPro = !!session?.user?.isPro;

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCancelled, setJustCancelled] = useState(false);

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      const r = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Couldn't cancel. Try again?");
        return;
      }
      await update({ isPro: false });
      setJustCancelled(true);
      setConfirming(false);
    } catch {
      setError("Network error. Try again?");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6 max-w-2xl">
      <div>
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-1">
          CURRENT PLAN
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                  isPro
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                    : "bg-white/[0.04] border-white/15 text-white/70"
                }`}
              >
                <i
                  className={`fa-solid ${
                    isPro ? "fa-crown" : "fa-user"
                  } text-[14px]`}
                />
              </div>
              <div>
                <div className="text-[16px] font-semibold">
                  {isPro ? "Pro" : "Free"}
                </div>
                <div className="text-[12.5px] text-white/55">
                  {isPro
                    ? "Full access to Quill AI, auto-sync, and unlimited history."
                    : "90 days of history and the core journal."}
                </div>
              </div>
            </div>
            {isPro ? (
              confirming ? (
                <div className="flex items-center gap-1.5 text-[12.5px] text-white/75">
                  <span>Cancel?</span>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={cancelling}
                    className="px-2.5 py-1 rounded-full text-white/70 hover:text-white hover:bg-white/[0.08] transition text-[12px] cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition text-[12px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {cancelling && (
                      <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
                    )}
                    Yes
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirming(true);
                    setJustCancelled(false);
                    setError(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
                >
                  Cancel Pro
                </button>
              )
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
              >
                <i className="fa-solid fa-arrow-up text-[11px]" />
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      </div>

      {justCancelled && (
        <div className="border border-teal-500/25 bg-teal-500/[0.06] rounded-xl px-3.5 py-2.5 text-[12.5px] text-teal-200 flex items-start gap-2">
          <i className="fa-solid fa-circle-check text-[12px] mt-0.5" />
          <span>You&apos;re back on the Free plan. Re-upgrade any time.</span>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-red-300 inline-flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />
          {error}
        </div>
      )}
    </div>
  );
}
