"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const ENDPOINT = "/api/user/dashboard-layout";

// Shared persistence for a piece of dashboard customisation state (the
// widget order, the widget sizes, or the "At a glance" tile order).
// localStorage is a fast offline cache for instant paint; the account
// copy is the source of truth and reconciles once fetched. Every mutation
// writes both.
//
//   field    — which key on the /api/user/dashboard-layout document this
//              value maps to.
//   sanitize — validates/normalises the raw stored or fetched value so a
//              removed id / bad shape can't break the render. MUST be a
//              stable (module-level) function.
export function usePersistedField<T>(
  storageKey: string,
  field: "layout" | "glanceTiles" | "widgetSizes" | "widgetRows",
  fallback: T,
  sanitize: (raw: unknown) => T,
): [T, (next: T) => void] {
  const [stored, setStored] = useLocalStorage<T>(storageKey, fallback);
  const value = useMemo(() => sanitize(stored), [stored, sanitize]);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || dirtyRef.current) return;
        if (data && data[field] != null) {
          setStored(sanitize(data[field]));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (next: T) => {
      dirtyRef.current = true;
      setStored(next);
      fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      }).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return [value, persist];
}
