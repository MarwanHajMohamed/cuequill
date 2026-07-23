"use client";

import { useSession } from "next-auth/react";
import { useSidebar } from "./navbar/SidebarContext";

// Offsets page content to the right of the desktop sidebar. Only applies
// when signed in (the sidebar renders for authenticated users) and only on
// md+ (mobile uses the bottom tab bar and stays full-width). Padding — not
// transform — so descendant `position: fixed` still resolves to the
// viewport. The offset tracks the sidebar's collapsed state so content
// slides over in step with the rail.
export default function ContentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const authed = status === "authenticated";
  const { collapsed } = useSidebar();
  const pad = collapsed ? "md:pl-[84px]" : "md:pl-[252px]";
  return (
    <div
      className={authed ? `${pad} transition-[padding] duration-300 ease-out` : ""}
    >
      {children}
    </div>
  );
}
