"use client";

import { useEffect, useState } from "react";
import { normalizeAccent } from "@/lib/accents";

const STORAGE_KEY = "cuequill:accent";

// Reads/sets the app-wide accent pack by toggling `data-accent` on <html>.
// The initial attribute is applied by the inline script in layout.tsx (no
// flash); this hook mirrors and updates it, persisting to localStorage so
// it survives reloads before the profile query resolves.
export function useAccent() {
  const [accent, setAccentState] = useState<string>("teal");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-accent") ?? "teal";
    setAccentState(normalizeAccent(current));
  }, []);

  const setAccent = (next: string) => {
    const id = normalizeAccent(next);
    document.documentElement.setAttribute("data-accent", id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setAccentState(id);
  };

  // Preview an accent without persisting it (attribute only). Used by the
  // settings picker so an un-saved preview doesn't leak into localStorage.
  const previewAccent = (next: string) => {
    document.documentElement.setAttribute("data-accent", normalizeAccent(next));
  };

  return { accent, setAccent, previewAccent };
}

// Apply an accent id to the document + localStorage without React state.
// Used by the profile→client sync so a fresh device reflects the saved
// preference.
export function applyAccent(id?: string | null) {
  const accent = normalizeAccent(id);
  document.documentElement.setAttribute("data-accent", accent);
  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    /* ignore */
  }
}
