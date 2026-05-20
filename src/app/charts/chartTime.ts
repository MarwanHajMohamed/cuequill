// ET wall-clock <-> chart time helpers. We encode ET wall-clock as fake-UTC
// so lightweight-charts displays correct ET times on every viewer.

export const RTH_OPEN_MIN = 9 * 60 + 30;
export const RTH_CLOSE_MIN = 16 * 60;

export function etComponents(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const g = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
  return {
    year: g("year"),
    month: g("month"),
    day: g("day"),
    hour: g("hour") === 24 ? 0 : g("hour"),
    minute: g("minute"),
  };
}

export function etToFakeUtcSeconds(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): number {
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 1000);
}

function bucketFromYmdHm(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): number | null {
  const mod = hour * 60 + minute;
  if (mod < RTH_OPEN_MIN || mod >= RTH_CLOSE_MIN) return null;
  let bucketHour: number;
  let bucketMinute: number;
  if (mod < RTH_OPEN_MIN + 30) {
    bucketHour = 9;
    bucketMinute = 30;
  } else {
    bucketHour = 10 + Math.floor((mod - 600) / 60);
    bucketMinute = 0;
  }
  return etToFakeUtcSeconds(year, month, day, bucketHour, bucketMinute);
}

export function bucketTimeForDate(d: Date): number | null {
  const et = etComponents(d);
  return bucketFromYmdHm(et.year, et.month, et.day, et.hour, et.minute);
}

// Tries strict ET conversion first; falls back to treating UTC components as
// ET wall-clock for trades imported before the parser was tz-aware.
export function bucketTimeForTradeDate(d: Date): number | null {
  const strict = bucketTimeForDate(d);
  if (strict !== null) return strict;
  return bucketFromYmdHm(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes()
  );
}
