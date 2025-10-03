// app/api/fed-meetings/route.ts
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cmeAuth";

const BASE_URL = "https://markets.api.cmegroup.com/fedwatch/v1/meetings/future";

export async function GET() {
  try {
    const token = await getAccessToken();

    const res = await fetch(BASE_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Fed meetings: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error fetching Fed meetings:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
