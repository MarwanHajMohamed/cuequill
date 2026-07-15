"use client";

import React from "react";

// One shared "Customize" control so every customise entry point across the
// app (dashboard layout, trades columns, trades stats) looks identical.
// Matches the dashboard's pill: icon + label, subtle glass by default,
// teal when its panel/edit mode is active.
export default function CustomizeButton({
  icon = "fa-sliders",
  label = "Customize",
  active = false,
  onClick,
  title,
  ariaExpanded,
  className = "",
}: {
  icon?: string;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  ariaExpanded?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label}
      aria-expanded={ariaExpanded}
      className={`inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition cursor-pointer ${
        active
          ? "border-teal-400/40 bg-teal-500/15 text-teal-200"
          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
      } ${className}`}
    >
      <i className={`fa-solid ${icon} text-[11px]`} />
      {label}
    </button>
  );
}
