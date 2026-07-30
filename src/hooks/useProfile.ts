import { useQuery } from "@tanstack/react-query";

export type Profile = {
  currency: string;
  startingBalance: number;
  riskPerTrade: number | null;
  avatarColor: string;
  avatarFrame: string;
  accentColor: string;
  cardSkin: string;
  equippedTitle: string;
  level: number;
  title: string;
  totalXp: number;
  into: number;
  per: number;
  isPro: boolean;
  proManualOverride: boolean;
  stripeCurrentPeriodEnd: string | null;
  stripeCancelAtPeriodEnd: boolean;
  memberSince: string;
};

const fetchProfile = async (): Promise<Profile> => {
  const res = await fetch("/api/user/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
};

// Account display preferences + read-only info (currency, starting
// balance, risk %, avatar colour, plan, member-since). Shared query key so
// a settings save can invalidate every consumer.
export function useProfile(enabled = true) {
  return useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
