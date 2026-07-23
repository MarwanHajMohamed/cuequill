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
  const [collapsed, setState] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v != null) setState(v === "1");
    } catch {}
  }, []);

  const setCollapsed = (v: boolean) => {
    setState(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
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
