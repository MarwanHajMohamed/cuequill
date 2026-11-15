// app/api/fed/route.ts
//
// Scrapes the Federal Reserve's FOMC calendar page directly so we get every
// meeting (past + future) for every year shown - including ones that already
// happened. The scraping lives in lib/fedCalendar so /api/econ-dates can reuse
// it and FOMC sits in the same pull as CPI/PPI/PCE.
//
// Response shape is unchanged so any existing callers keep working:
//   { payload: [{ meetingDt, type, offsetDayCount, status }], metadata: { ... } }

import { NextResponse } from "next/server";
import { fetchFomcEvents } from "@/lib/fedCalendar";

// Cache the Fed page for 24h - meeting schedules don't change frequently.
export const revalidate = 86400;

export async function GET() {
  try {
    const events = await fetchFomcEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return NextResponse.json({
      payload: events.map((e) => {
        const dt = new Date(`${e.date}T00:00:00Z`);
        const offsetDayCount = Math.round(
          (dt.getTime() - today.getTime()) / 86400000
        );
        return {
          meetingDt: e.date,
          type: e.type,
          offsetDayCount,
          status: "",
        };
      }),
      metadata: {
        pageSize: events.length,
        totalElements: events.length,
        elementsInResponse: events.length,
        pageNumber: 1,
        totalPages: 1,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error fetching Fed meetings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
