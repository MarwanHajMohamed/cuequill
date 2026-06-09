import { useEffect, useState } from "react";
import { fetchMeetings } from "@/hooks/useFed";
import { FedMeetingsResponse } from "@/app/types/FedMeeting";

const STORAGE_KEY = "cuequill:fed-dates";

/**
 * Fetches FOMC meeting dates from /api/fed (which scrapes the Fed's calendar),
 * with a localStorage cache so dates render instantly on first paint and
 * survive offline / API failures.
 *
 * Returns a Set of "yyyy-MM-dd" strings.
 */
export function useFedDates() {
  const [dates, setDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cached: string[] = [];
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) cached = JSON.parse(v);
    } catch {
      /* ignore parse errors */
    }
    if (cached.length) setDates(new Set(cached));

    async function load() {
      try {
        const data: FedMeetingsResponse = await fetchMeetings();
        const apiDates = data.payload.map((m) => m.meetingDt);
        setDates(new Set(apiDates));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(apiDates));
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
