"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";
import { setDisplayCurrency } from "@/lib/helpers/fmt";

// Applies the signed-in user's currency preference to the app-wide money
// formatters. Mounted once near the providers root. Only fetches while
// authenticated; the symbol also self-primes from localStorage in fmt.ts
// so the first paint is already correct on repeat visits.
export default function CurrencySync() {
  const { status } = useSession();
  const { data } = useProfile(status === "authenticated");

  useEffect(() => {
    if (data?.currency) setDisplayCurrency(data.currency);
  }, [data?.currency]);

  return null;
}
