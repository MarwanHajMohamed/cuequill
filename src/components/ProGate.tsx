"use client";

import Link from "next/link";
import React from "react";
import { useIsPro } from "@/hooks/useIsPro";

// Wraps a Pro-only surface. While the session is still loading we render
// the children so authenticated Pros don't see a flash of the lock. For
// free users we render a decorative, non-interactive placeholder behind a
// blur with a centered upgrade card linking to /pricing.
//
// SECURITY: the real `children` are NEVER rendered for non-Pro users - the
// blur is purely cosmetic and could be removed via devtools, so we must not
// put the actual gated UI (or any data it would fetch) into the DOM at all.
// The blurred backdrop is a generic skeleton with no real content. This is
// defence-in-depth on top of the server-side Pro checks in the API routes,
// which are the real boundary.
//
//   variant="overlay" (default) - full-surface gate (chat page, rules,
//     stats). The upgrade card is absolutely centered over the skeleton.
//   variant="inline" - same idea as a relatively-positioned block for a
//     normal-flow row such as a settings section.
//
// `feature` and `description` are the headline + supporting copy on the
// upgrade card.
type Props = {
  feature: string;
  description?: string;
  variant?: "overlay" | "inline";
  className?: string;
  children: React.ReactNode;
};

export default function ProGate({
  feature,
  description,
  variant = "overlay",
  className = "",
  children,
}: Props) {
  const { isPro, loading } = useIsPro();

  if (loading || isPro) {
    return <>{children}</>;
  }

  // Non-Pro: render ONLY a decorative placeholder + the upgrade card. The
  // real children are intentionally omitted from the DOM.
  if (variant === "inline") {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div
          aria-hidden
          className="pointer-events-none select-none filter blur-sm opacity-40"
        >
          <GatedPlaceholder compact />
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <UpgradeCard feature={feature} description={description} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none select-none filter blur-md opacity-40"
      >
        <GatedPlaceholder />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <UpgradeCard feature={feature} description={description} />
      </div>
    </div>
  );
}

// Generic frosted skeleton shown behind the upgrade card for free users.
// Deliberately contains no real content or data - it only exists to give
// the gate a believable, on-brand backdrop and enough height for the card
// to centre against. Safe to reveal via devtools: there's nothing here.
function GatedPlaceholder({ compact = false }: { compact?: boolean }) {
  const rows = compact ? 2 : 6;
  return (
    <div
      className={`w-full ${compact ? "py-6" : "py-12"} px-6 flex flex-col gap-4`}
    >
      <div className="h-6 w-40 rounded-md bg-white/[0.06]" />
      <div className="h-3 w-64 max-w-full rounded bg-white/[0.05]" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-white/[0.06] bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}

function UpgradeCard({
  feature,
  description,
}: {
  feature: string;
  description?: string;
}) {
  return (
    <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-[var(--surface)]/95 backdrop-blur-md shadow-[0_8px_40px_var(--shadow)] p-6 md:p-7 flex flex-col items-center text-center gap-3">
      <div className="w-11 h-11 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-300 flex items-center justify-center">
        <i className="fa-solid fa-lock text-[15px]" />
      </div>
      <div className="text-[11px] tracking-[0.12em] text-teal-300">
        Pro Feature
      </div>
      <h3 className="text-[17px] md:text-[18px] font-semibold tracking-tight text-white">
        {feature}
      </h3>
      {description && (
        <p className="text-[12.5px] text-white/65 leading-relaxed">
          {description}
        </p>
      )}
      <Link
        href="/pricing"
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition text-[12.5px] font-semibold"
      >
        Upgrade to Pro
        <i className="fa-solid fa-chevron-right text-[10px]" />
      </Link>
    </div>
  );
}
