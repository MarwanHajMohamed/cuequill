import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  console.log("Session:", session?.user?.id);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { timezone } = await req.json();
  console.log("Timezone to save:", timezone);

  await connectDb();

  const result = await User.findByIdAndUpdate(
    session.user.id,
    { timezone },
    { new: true }
  );
  console.log("Updated doc:", result);
  console.log("Update result:", result);

  return NextResponse.json({ success: true });
}
