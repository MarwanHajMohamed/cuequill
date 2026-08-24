import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy from "@/lib/models/Strategy";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import type { StrategyVideo } from "@/lib/strategySeed";

export const runtime = "nodejs";

const MAX_VIDEOS = 50;
const NAME_MAX = 200;

type Params = { params: Promise<{ id: string }> };

// Record a video the client has already uploaded to Vercel Blob against the
// strategy. Only the Blob URL + light metadata are stored.
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    url?: unknown;
    name?: unknown;
    size?: unknown;
    contentType?: unknown;
  };
  const url = typeof body.url === "string" ? body.url.trim() : "";
  // Only accept URLs that actually came from our blob store.
  if (!/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
    return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 });
  }

  const video: StrategyVideo = {
    id: randomUUID(),
    url,
    name:
      (typeof body.name === "string" && body.name.trim().slice(0, NAME_MAX)) ||
      "Video",
    size:
      typeof body.size === "number" && Number.isFinite(body.size)
        ? body.size
        : undefined,
    contentType:
      typeof body.contentType === "string" ? body.contentType : undefined,
    uploadedAt: new Date().toISOString(),
  };

  await connectDb();
  const res = await Strategy.updateOne(
    { _id: id, userId: session.user.id, [`videos.${MAX_VIDEOS - 1}`]: { $exists: false } },
    { $push: { videos: video } },
  );
  if (res.matchedCount === 0) {
    // Either not the owner / not found, or the cap is already hit.
    const exists = await Strategy.exists({ _id: id, userId: session.user.id });
    return NextResponse.json(
      {
        error: exists
          ? `You can attach at most ${MAX_VIDEOS} videos to a strategy.`
          : "Not found",
      },
      { status: exists ? 400 : 404 },
    );
  }
  return NextResponse.json({ video }, { status: 201 });
}
