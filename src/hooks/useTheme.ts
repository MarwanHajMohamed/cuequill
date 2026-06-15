"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "cuequill:theme";

// Reads/sets the app theme by toggling a class on <html>. The initial
// class is applied by the inline script in layout.tsx (no flash); this
// hook just mirrors and updates it.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("light") ? "light" : "dark",
    );
  }, []);

  const setTheme = (next: Theme) => {
    const el = document.documentElement;
    el.classList.remove("light", "dark");
    el.classList.add(next);
    el.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
  };

  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "light" ? "dark" : "light"),
  };
}
