import { describe, expect, it } from "vitest";
import {
  buildBuckets,
  jalaliKeyOf,
  jalaliMonthAfter,
  jalaliMonthStart,
  weekStart,
} from "./dates";

describe("weekStart", () => {
  it("returns the Saturday before, in Tehran time", () => {
    // 2026-10-03 is a Saturday; 2026-10-04 is a Sunday (env date)
    const sunday = new Date("2026-10-04T12:00:00Z");
    const start = weekStart(sunday);
    // Saturday 2026-10-03 00:00 Tehran = 2026-10-02T20:30:00Z
    expect(start.toISOString()).toBe("2026-10-02T20:30:00.000Z");
  });

  it("keeps Saturday itself in its own week", () => {
    const saturday = new Date("2026-10-03T12:00:00Z");
    expect(weekStart(saturday).toISOString()).toBe("2026-10-02T20:30:00.000Z");
  });

  it("maps Friday evening to the week that started on Saturday", () => {
    // Friday 2026-10-09 23:00 Tehran = 2026-10-09T19:30:00Z
    const friday = new Date("2026-10-09T19:30:00.000Z");
    expect(weekStart(friday).toISOString()).toBe("2026-10-02T20:30:00.000Z");
  });

  it("crosses the Tehran midnight boundary correctly", () => {
    // Saturday 2026-10-03 00:10 Tehran = 2026-10-02T20:40:00Z
    const justAfterMidnight = new Date("2026-10-02T20:40:00.000Z");
    expect(weekStart(justAfterMidnight).toISOString()).toBe("2026-10-02T20:30:00.000Z");
  });
});

describe("jalali month boundaries", () => {
  it("jalaliMonthStart maps to day 1 of the Jalali month", () => {
    const instant = new Date("2026-10-04T12:00:00Z");
    const start = jalaliMonthStart(instant);
    const original = jalaliKeyOf(instant);
    // +1h into the month start stays inside the same Jalali month
    const key = jalaliKeyOf(new Date(start.getTime() + 60 * 60 * 1000));
    expect(key.year).toBe(original.year);
    expect(key.month).toBe(original.month);
    // and the instant itself is not before the month start
    expect(start.getTime()).toBeLessThanOrEqual(instant.getTime());
  });

  it("month start is <= instant < next month start", () => {
    const instant = new Date("2026-01-15T12:00:00Z");
    const start = jalaliMonthStart(instant);
    const next = jalaliMonthAfter(instant);
    expect(start.getTime()).toBeLessThanOrEqual(instant.getTime());
    expect(next.getTime()).toBeGreaterThan(instant.getTime());
  });

  it("handles the Dey->Bahman (month 12 -> 1) rollover", () => {
    const inMonth12 = new Date("2027-03-10T12:00:00Z");
    const next = jalaliMonthAfter(inMonth12);
    const nextKey = jalaliKeyOf(new Date(next.getTime() + 60 * 60 * 1000));
    expect(nextKey.month).toBe(1);
    expect(nextKey.year).toBe(jalaliKeyOf(inMonth12).year + 1);
  });
});

describe("buildBuckets", () => {
  it("builds 12 weekly buckets ending with the current week", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    const buckets = buildBuckets("weekly", now);
    expect(buckets).toHaveLength(12);
    expect(buckets[11]!.start.getTime()).toBe(weekStart(now).getTime());
    for (const b of buckets) {
      expect(b.end.getTime() - b.start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    }
    expect(buckets[1]!.start.getTime()).toBe(buckets[0]!.end.getTime());
  });

  it("builds 12 monthly buckets, contiguous Jalali months", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    const buckets = buildBuckets("monthly", now);
    expect(buckets).toHaveLength(12);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i]!.start.getTime()).toBe(buckets[i - 1]!.end.getTime());
    }
    const currentKey = jalaliKeyOf(now);
    const lastKey = jalaliKeyOf(new Date(buckets[11]!.start.getTime() + 3600_000));
    expect(lastKey).toEqual({ year: currentKey.year, month: currentKey.month });
  });

  it("builds 5 yearly buckets ending with the current Jalali year", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    const buckets = buildBuckets("yearly", now);
    expect(buckets).toHaveLength(5);
    const lastKey = jalaliKeyOf(new Date(buckets[4]!.start.getTime() + 3600_000));
    expect(lastKey.year).toBe(jalaliKeyOf(now).year);
    expect(lastKey.month).toBe(1);
  });

  it("gives every bucket a Persian label", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    for (const period of ["weekly", "monthly", "yearly"] as const) {
      for (const bucket of buildBuckets(period, now)) {
        expect(bucket.label.length).toBeGreaterThan(0);
        expect([...bucket.label].some((ch) => ch.charCodeAt(0) > 127)).toBe(true);
      }
    }
  });
});
