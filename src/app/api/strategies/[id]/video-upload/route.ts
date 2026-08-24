import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy from "@/lib/models/Strategy";
import mongoose from "mongoose";

export const runtime = "nodejs";

// Issues a short-lived client-upload token so the browser can send a video
// straight to Vercel Blob (bypassing the ~4.5MB serverless body limit).
// Uploads are gated to the signed-in owner of the target strategy, capped in
// size, and restricted to video content types. Persisting the resulting blob
// onto the strategy happens separately (POST ../videos), since the
// onUploadCompleted callback doesn't fire in local dev.
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-m4v",
  "video/mpeg",
  "video/3gpp",
  "video/ogg",
];

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // The strategy must exist and belong to the caller before we hand out a
  // token that can write to blob storage.
  await connectDb();
  const owns = await Strategy.exists({ _id: id, userId: session.user.id });
  if (!owns) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_VIDEO_BYTES,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({
          strategyId: id,
          userId: session.user.id,
        }),
      }),
      // Persisting is done client-side after upload() resolves (see
      // ../videos), so nothing to do here.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
