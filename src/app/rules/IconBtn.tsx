"use client";

import React from "react";

export default function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition cursor-pointer disabled:opacity-25 disabled:cursor-default ${
        danger
          ? "text-white/40 hover:text-red-400 hover:bg-white/[0.06]"
          : "text-white/50 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      <i className={`fa-solid ${icon}`} />
    </button>
  );
}
