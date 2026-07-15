"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const ENDPOINT = "/api/user/dashboard-layout";

// Shared persistence for an ordered list of ids (dashboard widgets, or the
// stat tiles inside "At a glance"). localStorage is a fast offline cache
// for instant paint; the account copy is the source of truth and
// reconciles once fetched. Every mutation writes both.
//
//   field    — which key on the /api/user/dashboard-layout document this
//              list maps to ("layout" | "glanceTiles").
//   sanitize — drops unknown ids so a removed widget/tile can't break the
//              render. MUST be a stable (module-level) function.
export function usePersistedLayout<T extends string>(
  storageKey: string,
  field: "layout" | "glanceTiles",
  fallback: T[],
  sanitize: (raw: unknown) => T[],
): [T[], (next: T[]) => void] {
  const [stored, setStored] = useLocalStorage<T[]>(storageKey, fallback);
  const layout = useMemo(() => sanitize(stored), [stored, sanitize]);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || dirtyRef.current) return;
        if (data && Array.isArray(data[field])) {
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
    (next: T[]) => {
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

  return [layout, persist];
}
