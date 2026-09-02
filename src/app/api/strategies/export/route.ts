import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy from "@/lib/models/Strategy";
import { buildBundle, bundleFilename } from "@/lib/strategyTransfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/strategies/export - the caller's entire strategy library as a
// portable JSON bundle (drawings, descriptions, examples + outcomes, tags).
// Served as an attachment so the browser downloads it directly.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const strategies = await Strategy.find({ userId: session.user.id })
    .sort({ direction: 1, name: 1 })
    .lean();

  const bundle = buildBundle(strategies);

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${bundleFilename()}"`,
    },
  });
}
