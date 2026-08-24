import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy from "@/lib/models/Strategy";
import mongoose from "mongoose";
import type { StrategyVideo } from "@/lib/strategySeed";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; videoId: string }> };

// Remove a video from a strategy: delete the blob, then drop its metadata.
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, videoId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectDb();
  const strategy = await Strategy.findOne({
    _id: id,
    userId: session.user.id,
  }).lean<{ videos?: StrategyVideo[] }>();
  if (!strategy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const video = (strategy.videos ?? []).find((v) => v.id === videoId);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Best-effort blob removal; still drop the metadata even if the blob was
  // already gone so the UI can't get stuck on a dead entry.
  try {
    await del(video.url);
  } catch {
    /* ignore */
  }
  await Strategy.updateOne(
    { _id: id, userId: session.user.id },
    { $pull: { videos: { id: videoId } } },
  );
  return NextResponse.json({ ok: true });
}
