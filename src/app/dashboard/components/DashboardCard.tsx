"use client";

import React from "react";

// Shared shell for a single dashboard grid cell. One glass card look so
// every widget in the 2-up grid reads as part of the same system. Pass a
// title (with optional right-aligned `action`, e.g. a "Manage" link) to
// get the standard header row, or omit both for a bare card.
//
// CARD_CLASS_BASE is the look with no scroll behaviour — use it when the
// widget fills its own height (charts) or scrolls an inner region itself.
// CARD_CLASS adds whole-card scroll for widgets whose content should scroll
// when it's taller than the rows it's been given.
export const CARD_CLASS_BASE =
  "rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5";
export const CARD_CLASS = `${CARD_CLASS_BASE} overflow-y-auto chat-scroll`;

export function DashboardCard({
  title,
  action,
  children,
  className = "",
  bodyClassName = "flex flex-col gap-3",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`${CARD_CLASS} flex flex-col gap-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title ? (
            <h2 className="text-sm md:text-base font-semibold">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
