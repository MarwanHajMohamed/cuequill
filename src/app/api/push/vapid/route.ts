import { NextResponse } from "next/server";

// GET /api/push/vapid → { key: <base64 public key> }
// The client needs the VAPID public key to call
// `pushManager.subscribe({ applicationServerKey })`. We could also
// inline it via NEXT_PUBLIC_* but routing through an endpoint keeps the
// client free of build-time-baked secrets and lets us rotate keys.
export async function GET() {
  return NextResponse.json({
    key: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  });
}
