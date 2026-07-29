import { useQuery } from "@tanstack/react-query";

export type ChatUsage = {
  messagesToday: number;
  dailyLimit: number;
  tokensThisMonth: number;
  monthlyTokenLimit: number;
  bonusMessages: number;
  month: string; // yyyy-MM
};

const fetchChatUsage = async (): Promise<ChatUsage> => {
  const res = await fetch("/api/user/chat-usage");
  if (!res.ok) throw new Error("Failed to fetch chat usage");
  return res.json();
};

// Quill AI fair-use counters (messages today, tokens this month) for the
// plan tab's usage meters.
export function useChatUsage(enabled = true) {
  return useQuery<ChatUsage>({
    queryKey: ["chatUsage"],
    queryFn: fetchChatUsage,
    enabled,
    staleTime: 1000 * 60,
  });
}
