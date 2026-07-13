import { NextResponse } from "next/server";
import { getProStatus } from "@/lib/pro";

// Lightweight, DB-backed Pro check. The pricing page polls this after
// Stripe Checkout to detect the moment the webhook flips isPro — without
// repeatedly calling next-auth's update() (which churns the session and
// flickers the navbar).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { isPro } = await getProStatus();
  return NextResponse.json({ isPro });
}
