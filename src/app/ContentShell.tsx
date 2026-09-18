"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isMarketingRoute } from "./_marketing/routes";

// Offsets page content to the right of the desktop sidebar. Only applies
// when signed in (the sidebar renders for authenticated users) and only on
// md+ (mobile uses the bottom tab bar and stays full-width). Padding - not
// transform - so descendant `position: fixed` still resolves to the
// viewport. The actual offset (and its collapsed variant) lives in CSS
// under `.content-shell`, keyed off the `nav-collapsed` class on <html>
// that a pre-paint script sets - so the offset is correct on first paint
// with no expand→collapse flash.
export default function ContentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const authed = status === "authenticated";
  // On the marketing surfaces the sidebar is suppressed (the top marketing
  // navbar shows instead), so don't reserve the sidebar's offset there.
  const marketing = isMarketingRoute(pathname);
  return (
    <div className={authed && !marketing ? "content-shell" : ""}>{children}</div>
  );
}
