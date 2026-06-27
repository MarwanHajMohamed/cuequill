import React from "react";

// Small status badge marking a Pro account. Distinct from the locked
// "Pro" pill used to gate features (which carries a lock icon) — this
// one is celebratory, shown to users who already have Pro. Render it
// only behind an `isPro` check at the call site.
export default function ProTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-200 border border-teal-400/30 text-[9.5px] tracking-[0.1em] font-semibold uppercase leading-none ${className}`}
    >
      <i className="fa-solid fa-crown text-[8px]" /> Pro
    </span>
  );
}
