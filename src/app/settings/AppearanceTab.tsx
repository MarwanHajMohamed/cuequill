"use client";

import React from "react";
import { useTheme } from "@/hooks/useTheme";

// Appearance preferences. Theme applies instantly and is device-local
// (stored in localStorage), so there's no save button.
export default function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
          Theme
        </span>
        <p className="text-[12px] text-white/45 leading-relaxed max-w-md">
          Choose light or dark. Applies instantly and is remembered on this
          device.
        </p>
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 w-fit mt-1">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium capitalize transition cursor-pointer ${
                theme === t
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <i
                className={`fa-solid ${t === "dark" ? "fa-moon" : "fa-sun"} text-[11px]`}
              />
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
