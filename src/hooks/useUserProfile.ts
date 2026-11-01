import { useQuery } from "@tanstack/react-query";
import type { PublicProfile } from "@/app/api/users/[id]/route";

export type { PublicProfile };

async function fetchProfile(id: string): Promise<PublicProfile> {
  const res = await fetch(`/api/users/${id}`);
  if (res.status === 404) throw new Error("This profile isn't available.");
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

// Fetches a user's public profile. Pass null to keep it idle (e.g. while the
// modal is closed).
export function useUserProfile(id: string | null) {
  return useQuery<PublicProfile>({
    queryKey: ["userProfile", id],
    queryFn: () => fetchProfile(id as string),
    enabled: !!id,
    staleTime: 60_000,
  });
}
