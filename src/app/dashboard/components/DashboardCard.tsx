"use client";

import React from "react";

// Shared shell for a single dashboard grid cell. One glass card look so
// every widget in the 2-up grid reads as part of the same system. Pass a
// title (with optional right-aligned `action`, e.g. a "Manage" link) to
// get the standard header row, or omit both for a bare card.
//
// The grid gives each cell a fixed height per its row span, so cards scroll
// their own overflow (thin scrollbar) rather than clipping when a widget's
// content is taller than the rows it's been given.
export const CARD_CLASS =
  "rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5 overflow-y-auto chat-scroll";

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
