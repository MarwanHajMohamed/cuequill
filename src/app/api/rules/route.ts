import connectDb from "@/lib/db";
import Rule from "@/lib/models/Rule";
import { NextRequest, NextResponse } from "next/server";

// Get a user's custom rules (oldest first so they read top-to-bottom in
// the order they were added).
export async function GET(req: NextRequest) {
  await connectDb();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const rules = await Rule.find({ userId }).sort({ createdAt: 1 });
    return NextResponse.json(rules);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch rules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Add a new custom rule.
export async function POST(req: NextRequest) {
  await connectDb();

  try {
    const body = await req.json();
    const rule = await Rule.create(body);
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
