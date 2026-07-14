"use client";

import { useSession } from "next-auth/react";

// Offsets page content to the right of the desktop sidebar. Only applies
// when signed in (the sidebar renders for authenticated users) and only on
// md+ (mobile uses the bottom tab bar and stays full-width). Padding — not
// transform — so descendant `position: fixed` still resolves to the
// viewport.
export default function ContentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const authed = status === "authenticated";
  return <div className={authed ? "md:pl-[252px]" : ""}>{children}</div>;
}
