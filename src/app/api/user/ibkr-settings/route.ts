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
    "ibkrQueryId ibkrBalanceQueryId ibkrLastSync ibkrBalanceLastSync ibkrToken ibkrLastSyncInserted ibkrLastSyncSkipped"
  );

  return NextResponse.json({
    ibkrQueryId: user?.ibkrQueryId ?? "",
    ibkrBalanceQueryId: user?.ibkrBalanceQueryId ?? "",
    ibkrLastSync: user?.ibkrLastSync ?? null,
    ibkrBalanceLastSync: user?.ibkrBalanceLastSync ?? null,
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

  const { ibkrToken, ibkrQueryId, ibkrBalanceQueryId } = await req.json();

  await connectDb();
  await User.findByIdAndUpdate(session.user.id, {
    ...(ibkrToken !== undefined && { ibkrToken }),
    ...(ibkrQueryId !== undefined && { ibkrQueryId }),
    ...(ibkrBalanceQueryId !== undefined && { ibkrBalanceQueryId }),
  });

  return NextResponse.json({ success: true });
}
