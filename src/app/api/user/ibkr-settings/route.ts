import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "ibkrQueryId ibkrLastSync ibkrToken ibkrLastSyncInserted ibkrLastSyncSkipped"
  );

  return NextResponse.json({
    ibkrQueryId: user?.ibkrQueryId ?? "",
    ibkrLastSync: user?.ibkrLastSync ?? null,
    ibkrLastSyncInserted: user?.ibkrLastSyncInserted ?? null,
    ibkrLastSyncSkipped: user?.ibkrLastSyncSkipped ?? null,
    hasToken: !!user?.ibkrToken,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ibkrToken, ibkrQueryId } = await req.json();

  await connectDb();
  await User.findByIdAndUpdate(session.user.id, {
    ...(ibkrToken !== undefined && { ibkrToken }),
    ...(ibkrQueryId !== undefined && { ibkrQueryId }),
  });

  return NextResponse.json({ success: true });
}
