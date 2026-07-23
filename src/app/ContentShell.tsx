"use client";

import { useSession } from "next-auth/react";

// Offsets page content to the right of the desktop sidebar. Only applies
// when signed in (the sidebar renders for authenticated users) and only on
// md+ (mobile uses the bottom tab bar and stays full-width). Padding — not
// transform — so descendant `position: fixed` still resolves to the
// viewport. The actual offset (and its collapsed variant) lives in CSS
// under `.content-shell`, keyed off the `nav-collapsed` class on <html>
// that a pre-paint script sets — so the offset is correct on first paint
// with no expand→collapse flash.
export default function ContentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const authed = status === "authenticated";
  return <div className={authed ? "content-shell" : ""}>{children}</div>;
}
