// app/api/fed/route.ts
//
// Scrapes the Federal Reserve's FOMC calendar page directly so we get every
// meeting (past + future) for every year shown — including ones that already
// happened. The CME /fedwatch endpoint only returned future meetings, so days
// dropped off the calendar the moment they passed.
//
// Response shape is unchanged so the existing frontend code keeps working:
//   { payload: [{ meetingDt, offsetDayCount, status }], metadata: { ... } }

import { NextResponse } from "next/server";

const FED_URL =
  "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";

const MONTH_TO_NUM: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

// Cache the Fed page for 24h — meeting schedules don't change frequently.
export const revalidate = 86400;

type FedEventType = "meeting" | "minutes";
type FedEvent = { date: string; type: FedEventType };

export async function GET() {
  try {
    const res = await fetch(FED_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; cuequill/1.0)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Fed page: ${res.status}` },
        { status: res.status }
      );
    }
    const html = await res.text();
    const events = parseFomcEvents(html);
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

function parseFomcEvents(html: string): FedEvent[] {
  const meetings = new Set<string>();
  const minutes = new Set<string>();

  // Each year on the page lives under a heading like:
  //   <h4><a id="42828">2026 FOMC Meetings</a></h4>
  const yearRegex = /<h4>\s*<a id="\d+">\s*(\d{4})\s*FOMC Meetings/gi;
  const yearMatches = [...html.matchAll(yearRegex)];

  for (let i = 0; i < yearMatches.length; i++) {
    const year = yearMatches[i][1];
    const startIdx = yearMatches[i].index! + yearMatches[i][0].length;
    const endIdx =
      i + 1 < yearMatches.length ? yearMatches[i + 1].index! : html.length;
    const section = html.slice(startIdx, endIdx);

    // Split the section into one chunk per meeting row by looking-ahead for
    // the next "fomc-meeting__month" class. The first chunk (before the first
    // marker) is skipped.
    const blocks = section.split(/(?=fomc-meeting__month)/);
    for (let j = 1; j < blocks.length; j++) {
      const block = blocks[j];

      // Meeting date (decision day = day 2 of the range).
      // Format: <div class="... fomc-meeting__month ..."><strong>January</strong></div>
      //         ... <div class="... fomc-meeting__date ...">27-28</div>
      // Asterisks ("17-18*") mark press-conference meetings — we strip them.
      // Cross-month meetings are labeled "October/November".
      const monthMatch = block.match(
        /fomc-meeting__month[^>]*><strong>([A-Za-z/]+)<\/strong>/
      );
      const dateMatch = block.match(/fomc-meeting__date[^>]*>([^<]+)/);
      if (!monthMatch || !dateMatch) continue;

      const meetingIso = computeDecisionDate(
        year,
        monthMatch[1].trim(),
        dateMatch[1].trim()
      );
      if (meetingIso) meetings.add(meetingIso);

      // Minutes release date — appears as "(Released MMMM DD, YYYY)" near the
      // bottom of each past meeting's block. Future meetings don't have this.
      const releaseMatch = block.match(
        /\(Released\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\)/i
      );
      if (releaseMatch) {
        const monthNum = MONTH_TO_NUM[releaseMatch[1].toLowerCase()];
        const day = parseInt(releaseMatch[2], 10);
        const releaseYear = releaseMatch[3];
        if (monthNum && day >= 1 && day <= 31) {
          minutes.add(
            `${releaseYear}-${String(monthNum).padStart(2, "0")}-${String(
              day
            ).padStart(2, "0")}`
          );
        }
      }
    }
  }

  // Merge into a sorted list of events. If a date somehow appears as both
  // (shouldn't normally), prefer "meeting".
  const events: FedEvent[] = [];
  for (const d of meetings) events.push({ date: d, type: "meeting" });
  for (const d of minutes) {
    if (!meetings.has(d)) events.push({ date: d, type: "minutes" });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

// Given a year, raw month label ("January" or "October/November") and raw
// date range ("27-28" or "31-1"), return the decision day (day 2) as ISO.
function computeDecisionDate(
  year: string,
  monthRaw: string,
  dateRaw: string
): string | null {
  const months = monthRaw
    .split("/")
    .map((mo) => mo.toLowerCase().trim())
    .filter(Boolean);
  const startMonth = MONTH_TO_NUM[months[0]];
  if (!startMonth) return null;

  const cleanDate = dateRaw.replace(/[* ]/g, "").trim();
  const parts = cleanDate.split(/[-–/\s]+/).filter(Boolean);
  if (parts.length === 0) return null;

  const lastDay = parseInt(parts[parts.length - 1], 10);
  if (isNaN(lastDay) || lastDay < 1 || lastDay > 31) return null;

  let decisionMonth = startMonth;
  let decisionYear = parseInt(year, 10);

  // Cross-month meeting — month label like "October/November" wins,
  // otherwise infer from a date range whose second day is smaller.
  if (months.length > 1) {
    const endMonth = MONTH_TO_NUM[months[1]];
    if (endMonth) decisionMonth = endMonth;
  } else if (parts.length > 1) {
    const firstDay = parseInt(parts[0], 10);
    if (!isNaN(firstDay) && lastDay < firstDay) {
      decisionMonth = startMonth + 1;
      if (decisionMonth > 12) {
        decisionMonth = 1;
        decisionYear += 1;
      }
    }
  }

  return `${decisionYear}-${String(decisionMonth).padStart(
    2,
    "0"
  )}-${String(lastDay).padStart(2, "0")}`;
}
