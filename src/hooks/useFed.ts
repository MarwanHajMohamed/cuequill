import { NextResponse } from "next/server";

export async function fetchMeetings() {
  try {
    const res = await fetch("/api/fed");
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching meetings:", err);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}
