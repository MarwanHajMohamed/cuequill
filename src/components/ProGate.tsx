"use client";

import Link from "next/link";
import React from "react";
import { useIsPro } from "@/hooks/useIsPro";

// Wraps a Pro-only surface. While the session is still loading we
// render the children without the overlay so authenticated Pros don't
// see a flash of the lock. For free users we render the same children
// behind a blur with a centered upgrade card linking to /pricing.
//
//   variant="overlay" (default) — children remain mounted, blurred and
//     pointer-events-none. Use when the surface is mostly self-contained
//     and looks fine frozen behind the prompt (chat page, rules, stats).
//   variant="inline" — same overlay but as a relatively-positioned
//     block instead of absolute. For dropping into a normal flow row
//     such as a settings section.
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

  if (variant === "inline") {
    return (
      <div className={`relative ${className}`}>
        <div
          aria-hidden
          className="pointer-events-none select-none filter blur-sm opacity-60"
        >
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <UpgradeCard feature={feature} description={description} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none select-none filter blur-md opacity-50"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <UpgradeCard feature={feature} description={description} />
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
