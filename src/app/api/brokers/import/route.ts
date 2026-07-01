import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { importFills } from "@/lib/ibkrSync";
import { getBrokerAdapter, type BrokerId } from "@/lib/brokers";

// Upload an exported statement (CSV) from a file-based broker and import
// the trades. The broker is selected by the `broker` form field; its
// adapter parses the file into fills and the shared pipeline matches +
// dedupes + inserts them, exactly like the IBKR pull sync.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const brokerId = String(formData.get("broker") ?? "") as BrokerId;

  if (!brokerId) {
    return NextResponse.json({ error: "No broker specified" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  let adapter;
  try {
    adapter = getBrokerAdapter(brokerId);
  } catch {
    return NextResponse.json({ error: "Unsupported broker" }, { status: 400 });
  }

  if (adapter.mode !== "file" || !adapter.parseFills) {
    return NextResponse.json(
      { error: `${adapter.label} is imported automatically, not from a file.` },
      { status: 400 },
    );
  }

  try {
    const text = await file.text();
    const fills = adapter.parseFills(text);
    if (fills.length === 0) {
      return NextResponse.json(
        { error: "No option trades found in this file." },
        { status: 400 },
      );
    }
    const result = await importFills(session.user.id, fills);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
