"use client";

import { useTheme } from "@/hooks/useTheme";

// Single switch. Two equal 24×24 slots inside a 52-wide pill: moon on
// the left, sun on the right. Thumb is a 24×24 circle that slides
// between them; whichever icon is "behind" the thumb is the active
// theme. Both icons sit perfectly centered in their slots so the icon
// stays dead-center even when the thumb covers it.
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isLight}
      aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}
      title={`Switch to ${isLight ? "dark" : "light"} theme`}
      className="relative inline-flex w-[52px] h-7 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition cursor-pointer"
    >
      {/* Thumb - 24px circle, slides between the two slots. */}
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white/15 border border-white/20 shadow-[0_2px_8px_var(--shadow-soft)] transition-[left] duration-200 ease-out ${
          isLight ? "left-[26px]" : "left-0.5"
        }`}
      />

      {/* Moon slot (left). */}
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 flex items-center justify-center pointer-events-none transition-colors ${
          isLight ? "text-white/40" : "text-teal-300"
        }`}
      >
        <i className="fa-solid fa-moon text-[10px]" />
      </span>

      {/* Sun slot (right). */}
      <span
        className={`absolute top-0.5 left-[26px] w-6 h-6 flex items-center justify-center pointer-events-none transition-colors ${
          isLight ? "text-teal-300" : "text-white/40"
        }`}
      >
        <i className="fa-solid fa-sun text-[10px]" />
      </span>
    </button>
  );
}
