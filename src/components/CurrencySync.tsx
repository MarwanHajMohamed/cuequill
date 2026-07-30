"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";
import { setDisplayCurrency } from "@/lib/helpers/fmt";
import { applyAccent, clearAccent } from "@/hooks/useAccent";

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

  // Signed out → drop the accent (and its background tint) so the landing
  // and other logged-out pages render in the neutral default. Only acts on a
  // definitive "unauthenticated" (not the transient "loading" state) to
  // avoid clearing an authenticated user's accent mid-resolve.
  useEffect(() => {
    if (status === "unauthenticated") clearAccent();
  }, [status]);

  return null;
}
