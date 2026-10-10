export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Offset (local - UTC) of a timezone at a given instant, in ms.
function offsetAt(utcMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));

  return localAsUtc - Math.floor(utcMs / 1000) * 1000;
}

// Converts a wall-clock time in `timezone` (month is 1-12; day may overflow) to the real UTC instant.
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(guess - offsetAt(guess, timezone));
}
