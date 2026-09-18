"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") return null;
  if (!session) return null;
  // The landing page ("/") shows the top marketing navbar for logged-in
  // users instead of the app sidebar.
  if (pathname === "/") return null;

  return <Navbar />;
}
