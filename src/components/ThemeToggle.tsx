"use client";

import { useTheme } from "@/hooks/useTheme";

// Compact segmented Light/Dark switch. Uses the white-neutral utilities so
// it themes itself like the rest of the app.
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark"; icon: string }[] = [
    { value: "light", icon: "fa-sun" },
    { value: "dark", icon: "fa-moon" },
  ];
  return (
    <div className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5">
      {options.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            aria-label={`${o.value} theme`}
            aria-pressed={active}
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
              active ? "text-teal-300" : "text-white/45 hover:text-white/75"
            }`}
          >
            {active && (
              <span className="absolute inset-0 rounded-full bg-white/10 border border-white/15" />
            )}
            <i className={`relative fa-solid ${o.icon} text-[11px]`} />
          </button>
        );
      })}
    </div>
  );
}
