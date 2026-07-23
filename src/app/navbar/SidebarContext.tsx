"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Shared collapsed state for the desktop sidebar. Both the Navbar (which
// draws the rail) and ContentShell (which offsets the page to the right of
// it) read this, so collapsing the sidebar slides the content over in
// lockstep. Persisted to localStorage so the choice sticks across reloads.
type SidebarCtx = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

const Ctx = createContext<SidebarCtx>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
});

const KEY = "cuequill:sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Initialise synchronously from the `nav-collapsed` class the pre-paint
  // script set from localStorage, so the very first client render already
  // matches the persisted choice (no flash). SSR has no document → false.
  const [collapsed, setState] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("nav-collapsed")
      : false,
  );

  // Keep the <html> class in sync in case another tab changed the setting.
  useEffect(() => {
    document.documentElement.classList.toggle("nav-collapsed", collapsed);
  }, [collapsed]);

  const setCollapsed = (v: boolean) => {
    setState(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("nav-collapsed", v);
    }
  };

  return (
    <Ctx.Provider
      value={{ collapsed, toggle: () => setCollapsed(!collapsed), setCollapsed }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSidebar = () => useContext(Ctx);
