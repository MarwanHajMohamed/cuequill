import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { PushDevice } from "@/lib/models/PushDevice";

export const runtime = "nodejs";

// POST  → register (or refresh) this device's APNs token for the signed-in
//         user. Idempotent: the token is unique, so re-registering the same
//         device upserts and re-points it at the current user.
// DELETE → unregister a token (e.g. the user turned push off, or signed out).

type RegisterBody = {
  token?: unknown;
  platform?: unknown;
  environment?: unknown;
  bundleId?: unknown;
};

// APNs tokens are hex. Accept a reasonable length range so a malformed value
// can't bloat the collection.
function isValidToken(t: unknown): t is string {
  return typeof t === "string" && /^[0-9a-fA-F]{32,200}$/.test(t);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as RegisterBody;
  if (!isValidToken(body.token)) {
    return NextResponse.json(
      { error: "A valid device token is required." },
      { status: 400 },
    );
  }

  const environment =
    body.environment === "sandbox" ? "sandbox" : "production";
  const bundleId =
    typeof body.bundleId === "string" && body.bundleId
      ? body.bundleId
      : "com.cuequill.app";

  await connectDB();
  await PushDevice.findOneAndUpdate(
    { token: body.token },
    {
      userId: session.user.id,
      token: body.token,
      platform: "ios",
      environment,
      bundleId,
      lastSeenAt: new Date(),
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as RegisterBody;
  if (!isValidToken(body.token)) {
    return NextResponse.json(
      { error: "A valid device token is required." },
      { status: 400 },
    );
  }

  await connectDB();
  // Scope the delete to the signed-in user so a token can only be removed by
  // its owner.
  await PushDevice.deleteOne({ token: body.token, userId: session.user.id });
  return NextResponse.json({ ok: true });
}
