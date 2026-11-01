import { useEffect, useState } from "react";
import { fetchMeetings } from "@/hooks/useFed";
import { FedMeetingsResponse } from "@/app/types/FedMeeting";

const STORAGE_KEY = "cuequill:fed-dates-v2";

export type FedDates = {
  meetings: Set<string>; // rate-decision days
  minutes: Set<string>; // minutes-release days (3 weeks after each meeting)
};

/**
 * Fetches FOMC dates from /api/fed (which scrapes the Fed's calendar), split
 * into rate-decision meetings and minutes-release days. localStorage-cached so
 * dates render instantly on first paint and survive offline / API failures.
 *
 * Both are Sets of "yyyy-MM-dd" strings.
 */
export function useFedDates(): FedDates {
  const [dates, setDates] = useState<FedDates>({
    meetings: new Set(),
    minutes: new Set(),
  });

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) {
        const c = JSON.parse(v) as { meetings: string[]; minutes: string[] };
        setDates({
          meetings: new Set(c.meetings ?? []),
          minutes: new Set(c.minutes ?? []),
        });
      }
    } catch {
      /* ignore parse errors */
    }

    async function load() {
      try {
        const data: FedMeetingsResponse = await fetchMeetings();
        const meetings: string[] = [];
        const minutes: string[] = [];
        for (const m of data.payload) {
          if (m.type === "minutes") minutes.push(m.meetingDt);
          else meetings.push(m.meetingDt);
        }
        setDates({ meetings: new Set(meetings), minutes: new Set(minutes) });
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ meetings, minutes }),
          );
        } catch {
          /* quota / availability - non-fatal */
        }
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : "Error fetching Fed meetings"
        );
      }
    }
    load();
  }, []);

  return dates;
}
