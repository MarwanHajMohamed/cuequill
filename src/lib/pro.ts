import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

// Server-side Pro check. Reads the live DB flag so a session minted
// before an upgrade is honored immediately, and a Pro who later loses
// access can't keep firing gated endpoints from a stale JWT.
export async function getProStatus(): Promise<{
  userId: string | null;
  isPro: boolean;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) return { userId: null, isPro: false };
  await connectDb();
  const user = await User.findById(userId).select("isPro").lean<{ isPro?: boolean }>();
  return { userId, isPro: !!user?.isPro };
}
