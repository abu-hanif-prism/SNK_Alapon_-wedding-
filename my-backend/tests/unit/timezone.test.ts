import { describe, expect, it } from "vitest";
import { isValidTimezone, zonedTimeToUtc } from "../../src/lib/timezone";

describe("zonedTimeToUtc", () => {
  it("converts Dhaka (UTC+6, no DST) midnight to the previous day 18:00 UTC", () => {
    expect(zonedTimeToUtc(2026, 12, 25, 0, 0, 0, "Asia/Dhaka").toISOString()).toBe("2026-12-24T18:00:00.000Z");
  });

  it("handles daylight saving time (New York)", () => {
    expect(zonedTimeToUtc(2026, 7, 1, 0, 0, 0, "America/New_York").toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(zonedTimeToUtc(2026, 1, 15, 0, 0, 0, "America/New_York").toISOString()).toBe("2026-01-15T05:00:00.000Z");
  });

  it("lets the day overflow into the next month", () => {
    expect(zonedTimeToUtc(2026, 12, 32, 0, 0, 0, "Asia/Dhaka").toISOString()).toBe("2026-12-31T18:00:00.000Z");
  });

  it("is a no-op for UTC", () => {
    expect(zonedTimeToUtc(2026, 5, 5, 13, 30, 15, "UTC").toISOString()).toBe("2026-05-05T13:30:15.000Z");
  });
});

describe("isValidTimezone", () => {
  it("accepts real IANA zones", () => {
    expect(isValidTimezone("Asia/Dhaka")).toBe(true);
    expect(isValidTimezone("Europe/London")).toBe(true);
  });

  it("rejects made-up zones", () => {
    expect(isValidTimezone("Mars/Base")).toBe(false);
    expect(isValidTimezone("not a zone")).toBe(false);
  });
});
