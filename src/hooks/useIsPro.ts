"use client";

import { useSession } from "next-auth/react";

// Reads the Pro flag off the next-auth session. While the session is
// still loading we return false so locked surfaces stay locked rather
// than briefly flashing the unlocked UI.
export function useIsPro(): { isPro: boolean; loading: boolean } {
  const { data, status } = useSession();
  return {
    isPro: !!data?.user?.isPro,
    loading: status === "loading",
  };
}
