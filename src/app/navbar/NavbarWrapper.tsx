"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import { isMarketingRoute } from "../_marketing/routes";

export default function NavbarWrapper() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") return null;
  if (!session) return null;
  // The marketing surfaces (landing, features, pricing) show the top
  // marketing navbar for logged-in users instead of the app sidebar.
  if (isMarketingRoute(pathname)) return null;

  return <Navbar />;
}
