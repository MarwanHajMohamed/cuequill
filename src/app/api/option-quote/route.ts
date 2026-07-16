import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOptionMarks,
  isOptionsConfigured,
  occSymbol,
  type OptionPosition,
  type OptionType,
} from "@/lib/optionsData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/option-quote
// Body: { positions: [{ symbol, expiry, strike, type }] }
// Returns real option marks (bid/ask/last/mark) keyed by the OCC symbol,
// plus a per-position map so the client can line marks up with its trades
// without re-deriving OCC symbols. Auth-gated (any signed-in user).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOptionsConfigured()) {
    // Not an error — the client falls back to the underlying quote.
    return NextResponse.json({ configured: false, marks: {}, bySymbol: {} });
  }

  let body: { positions?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.positions) ? body.positions : [];
  const positions: OptionPosition[] = [];
  for (const p of raw.slice(0, 100)) {
    const o = p as Record<string, unknown>;
    const symbol = String(o.symbol ?? "").trim();
    const expiry = String(o.expiry ?? "").trim();
    const strike = Number(o.strike);
    const type: OptionType = o.type === "PUT" ? "PUT" : "CALL";
    if (!symbol || !expiry || !Number.isFinite(strike)) continue;
    positions.push({ symbol, expiry, strike, type });
  }

  try {
    const marks = await getOptionMarks(positions);
    // Map each requested position (by its OCC symbol) so the client can
    // key on the same symbol it would compute locally.
    const bySymbol: Record<string, string> = {};
    for (const p of positions) {
      const occ = occSymbol(p);
      if (occ) bySymbol[`${p.symbol.toUpperCase()}|${p.expiry}|${p.strike}|${p.type}`] = occ;
    }
    return NextResponse.json({
      configured: true,
      marks: Object.fromEntries(marks),
      bySymbol,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Option lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
