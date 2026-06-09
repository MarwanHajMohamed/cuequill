import React from "react";
import { PageLoader } from "@/components/Loaders";

// Used by withAuth while NextAuth resolves the session. Match the rest
// of the app's loading language - no plain spinner on a blank page.
export default function PageLoading() {
  return <PageLoader />;
}
