import { useQuery } from "@tanstack/react-query";
import type { ChallengeCategory } from "@/lib/challenges";

export type ChallengeProgress = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ChallengeCategory;
  target: number;
  xp: number;
  minLevel: number;
  locked: boolean;
  progress: number;
  complete: boolean;
  claimed: boolean;
};

export type ChallengesData = {
  challenges: ChallengeProgress[];
  level: number;
  title: string;
  into: number;
  per: number;
  totalXp: number;
  claimable: number;
  badges: string[];
};

const fetchChallenges = async (): Promise<ChallengesData> => {
  const res = await fetch("/api/challenges");
  if (!res.ok) throw new Error("Failed to fetch challenges");
  return res.json();
};

export function useChallenges(enabled = true) {
  return useQuery<ChallengesData>({
    queryKey: ["challenges"],
    queryFn: fetchChallenges,
    enabled,
    staleTime: 1000 * 60,
  });
}
