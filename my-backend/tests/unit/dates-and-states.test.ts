import { describe, expect, it } from "vitest";
import { insertAt } from "../../src/modules/gallery/gallery.layout";
import { addMonths, computeEndsAt } from "../../src/modules/subscriptions/subscription-period";
import { linkState } from "../../src/modules/upload-links/link-state";

const utc = (iso: string) => new Date(iso);

describe("addMonths", () => {
  it("clamps to the end of a shorter month instead of overflowing", () => {
    expect(addMonths(utc("2026-01-31T00:00:00Z"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addMonths(utc("2028-01-31T00:00:00Z"), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(addMonths(utc("2026-03-31T00:00:00Z"), 1).toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  it("rolls over the year and keeps the time of day", () => {
    expect(addMonths(utc("2026-12-15T09:30:00Z"), 1).toISOString()).toBe("2027-01-15T09:30:00.000Z");
  });

  it("handles a leap day one year later", () => {
    expect(addMonths(utc("2024-02-29T00:00:00Z"), 12).toISOString()).toBe("2025-02-28T00:00:00.000Z");
  });
});

describe("computeEndsAt", () => {
  const start = utc("2026-10-10T05:00:00Z");

  it("adds one month or one year", () => {
    expect(computeEndsAt(start, "MONTHLY")?.toISOString()).toBe("2026-11-10T05:00:00.000Z");
    expect(computeEndsAt(start, "YEARLY")?.toISOString()).toBe("2027-10-10T05:00:00.000Z");
  });

  it("never expires a one-time plan", () => {
    expect(computeEndsAt(start, "ONE_TIME")).toBeNull();
  });

  it("uses the package's own duration when it has one", () => {
    expect(computeEndsAt(start, "ONE_TIME", 2)?.toISOString()).toBe("2026-12-10T05:00:00.000Z");
    expect(computeEndsAt(start, "YEARLY", 12)?.toISOString()).toBe("2027-10-10T05:00:00.000Z");
    expect(computeEndsAt(start, "MONTHLY", null)?.toISOString()).toBe("2026-11-10T05:00:00.000Z");
  });

  it("does not modify the date it was given", () => {
    computeEndsAt(start, "YEARLY");
    expect(start.toISOString()).toBe("2026-10-10T05:00:00.000Z");
  });
});

describe("linkState", () => {
  const link = { opensAt: utc("2026-06-01T00:00:00Z"), closesAt: utc("2026-06-03T00:00:00Z"), revokedAt: null };

  it("is scheduled, open, then closed over time", () => {
    expect(linkState(link, utc("2026-05-31T23:59:59Z"))).toBe("scheduled");
    expect(linkState(link, utc("2026-06-01T00:00:00Z"))).toBe("open");
    expect(linkState(link, utc("2026-06-03T00:00:00Z"))).toBe("open");
    expect(linkState(link, utc("2026-06-03T00:00:01Z"))).toBe("closed");
  });

  it("revoked wins over every other state", () => {
    const revoked = { ...link, revokedAt: utc("2026-06-02T00:00:00Z") };
    expect(linkState(revoked, utc("2026-06-02T12:00:00Z"))).toBe("revoked");
  });
});

describe("insertAt", () => {
  it("appends when no position is given", () => {
    expect(insertAt([1, 2, 3], 9, undefined)).toEqual([1, 2, 3, 9]);
  });

  it("inserts at a position and clamps out-of-range values", () => {
    expect(insertAt([1, 2, 3], 9, 0)).toEqual([9, 1, 2, 3]);
    expect(insertAt([1, 2, 3], 9, 1)).toEqual([1, 9, 2, 3]);
    expect(insertAt([1, 2, 3], 9, 99)).toEqual([1, 2, 3, 9]);
    expect(insertAt([1, 2, 3], 9, -5)).toEqual([9, 1, 2, 3]);
  });

  it("does not modify the original list", () => {
    const list = [1, 2];
    insertAt(list, 3, 0);
    expect(list).toEqual([1, 2]);
  });
});
