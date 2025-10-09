"use client";

import { useSession } from "next-auth/react";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) return null;

  return <Navbar />;
}
