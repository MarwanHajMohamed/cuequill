"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";
import { setDisplayCurrency } from "@/lib/helpers/fmt";
import { applyAccent } from "@/hooks/useAccent";

// Applies the signed-in user's display preferences (currency + accent pack)
// to the app. Mounted once near the providers root. Only fetches while
// authenticated; the currency symbol and accent also self-prime from
// localStorage (fmt.ts / the layout inline script) so the first paint is
// already correct on repeat visits.
export default function CurrencySync() {
  const { status } = useSession();
  const { data } = useProfile(status === "authenticated");

  useEffect(() => {
    if (data?.currency) setDisplayCurrency(data.currency);
  }, [data?.currency]);

  useEffect(() => {
    if (data?.accentColor) applyAccent(data.accentColor);
  }, [data?.accentColor]);

  return null;
}
