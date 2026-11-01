"use client";

import React, { useMemo, useState } from "react";

// A deliberate, multi-step "are you sure" flow for cancelling Pro. Every step
// leads with a prominent "Keep my Pro" and only a quiet, secondary link
// continues toward cancellation - retention friction, not a trap: the final
// step always completes the cancellation the user asked for. Access continues
// until the period end, so nothing is lost immediately.

const REASONS = [
  "Too expensive",
  "I'm not using it enough",
  "Missing a feature I need",
  "Just taking a break",
  "Something else",
];

type Step = "lose" | "offer" | "reason" | "confirm";

export default function CancelProModal({
  open,
  onClose,
  periodEnd,
  cycle,
  proFeatures,
  offerAnnual,
  onSwitchAnnual,
  switching,
  onConfirmCancel,
  cancelling,
  error,
}: {
  open: boolean;
  onClose: () => void;
  periodEnd: string;
  cycle: "monthly" | "annual" | null;
  proFeatures: string[];
  offerAnnual: boolean;
  onSwitchAnnual: () => void;
  switching: boolean;
  onConfirmCancel: () => void;
  cancelling: boolean;
  error: string | null;
}) {
  // The ordered steps for this user - the annual offer is skipped for people
  // who can't take it (already annual, or scheduled to cancel).
  const steps = useMemo<Step[]>(
    () =>
      offerAnnual
        ? ["lose", "offer", "reason", "confirm"]
        : ["lose", "reason", "confirm"],
    [offerAnnual],
  );
  const [idx, setIdx] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [ack, setAck] = useState(false);

  // Reset to the first step whenever the modal is (re)opened.
  React.useEffect(() => {
    if (open) {
      setIdx(0);
      setReason(null);
      setAck(false);
    }
  }, [open]);

  if (!open) return null;

  const step = steps[idx];
  const next = () => setIdx((i) => Math.min(i + 1, steps.length - 1));

  const KeepButton = (
    <button
      type="button"
      onClick={onClose}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#fff] text-[14px] font-semibold transition cursor-pointer shadow-[0_8px_30px_-8px_rgba(20,184,166,0.6)]"
    >
      <i className="fa-solid fa-crown text-[12px]" />
      Keep my Pro
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden"
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i <= idx ? "w-6 bg-teal-400" : "w-3 bg-white/15"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-[13px]" />
          </button>
        </div>

        <div className="px-6 pt-3 pb-6">
          {step === "lose" && (
            <>
              <h3 className="text-[18px] font-semibold">
                Before you cancel — here&apos;s what you&apos;d lose
              </h3>
              <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">
                Your Pro tools go away when the plan ends. Keeping Pro means
                none of this stops.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {proFeatures.map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-white/80"
                  >
                    <i className="fa-solid fa-circle-xmark text-red-400/80 text-[12px] mt-[3px]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                {KeepButton}
                <button
                  type="button"
                  onClick={next}
                  className="w-full text-center text-[12.5px] text-white/40 hover:text-white/70 transition cursor-pointer py-1"
                >
                  Continue cancelling
                </button>
              </div>
            </>
          )}

          {step === "offer" && (
            <>
              <h3 className="text-[18px] font-semibold">
                Would a lower price help?
              </h3>
              <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">
                You&apos;re on monthly billing. Switch to annual and save 20% —
                same Pro, a smaller bill.
              </p>
              <div className="mt-4 rounded-xl border border-teal-500/25 bg-teal-500/[0.07] p-4">
                <div className="flex items-center gap-2 text-teal-300 text-[13px] font-medium">
                  <i className="fa-solid fa-piggy-bank text-[13px]" />
                  Annual — save 20%
                </div>
                <p className="mt-1 text-[12px] text-white/55">
                  Two months free versus paying monthly.
                </p>
                <button
                  type="button"
                  onClick={onSwitchAnnual}
                  disabled={switching}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#fff] text-[13px] font-semibold transition cursor-pointer disabled:opacity-60"
                >
                  {switching && (
                    <i className="fa-solid fa-circle-notch animate-spin text-[11px]" />
                  )}
                  {switching ? "Opening checkout…" : "Switch to annual & save"}
                </button>
              </div>
              <div className="mt-5 flex flex-col gap-2.5">
                {KeepButton}
                <button
                  type="button"
                  onClick={next}
                  className="w-full text-center text-[12.5px] text-white/40 hover:text-white/70 transition cursor-pointer py-1"
                >
                  No thanks, continue cancelling
                </button>
              </div>
            </>
          )}

          {step === "reason" && (
            <>
              <h3 className="text-[18px] font-semibold">
                Mind telling us why?
              </h3>
              <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">
                It helps us make Cuequill better — and we might be able to help.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {REASONS.map((r) => {
                  const on = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-[13px] transition cursor-pointer ${
                        on
                          ? "border-teal-500/40 bg-teal-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                      }`}
                    >
                      <i
                        className={`fa-${on ? "solid" : "regular"} fa-circle${on ? "-check" : ""} text-[13px] ${
                          on ? "text-teal-300" : "text-white/30"
                        }`}
                      />
                      {r}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-col gap-2.5">
                {KeepButton}
                <button
                  type="button"
                  onClick={next}
                  disabled={!reason}
                  className="w-full text-center text-[12.5px] text-white/40 hover:text-white/70 transition cursor-pointer py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue cancelling
                </button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <h3 className="text-[18px] font-semibold">
                Confirm cancellation
              </h3>
              <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">
                You&apos;ll keep full Pro access until{" "}
                <span className="text-white/85 font-medium">
                  {periodEnd || "the end of your billing period"}
                </span>
                . After that your {cycle ?? ""} plan won&apos;t renew and you&apos;ll
                move to Free.
              </p>
              <label className="mt-4 flex items-start gap-2.5 text-[13px] text-white/75 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  className="mt-0.5 accent-red-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  I understand I&apos;ll lose Pro
                  {periodEnd ? ` on ${periodEnd}` : " at period end"}.
                </span>
              </label>
              {error && (
                <div className="mt-3 text-[12px] text-red-300 inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation text-[10px]" />
                  {error}
                </div>
              )}
              <div className="mt-5 flex flex-col gap-2.5">
                {KeepButton}
                <button
                  type="button"
                  onClick={onConfirmCancel}
                  disabled={!ack || cancelling}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-[13px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {cancelling && (
                    <i className="fa-solid fa-circle-notch animate-spin text-[11px]" />
                  )}
                  {cancelling ? "Cancelling…" : "Cancel my membership"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
