"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { normalizeCardSkin } from "@/lib/cardSkins";

// Shared helper for the share modals: the viewer's level (for skin gating),
// their saved default skin, and a persist function that remembers a newly
// picked skin as their default. Optimistically updates the cached profile so
// the choice sticks immediately, then writes it through the profile API.
export function useCardSkinPrefs() {
  const { data } = useProfile();
  const qc = useQueryClient();

  const persist = (id: string) => {
    const skin = normalizeCardSkin(id);
    qc.setQueryData<Profile>(["profile"], (old) =>
      old ? { ...old, cardSkin: skin } : old,
    );
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardSkin: skin }),
    }).catch(() => {
      /* best-effort; the local preview already reflects the choice */
    });
  };

  return {
    level: data?.level ?? 1,
    cardSkin: data?.cardSkin ?? "midnight",
    persist,
  };
}
