import jalaali from "jalaali-js";
import type { JalaaliDateObject } from "jalaali-js";
import type { Period } from "@hh/shared";

const { toGregorian, toJalaali } = jalaali;

export const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;

export interface TimeBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

const weekLabel = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  month: "long",
  day: "numeric",
});

const monthLabel = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  month: "long",
  year: "numeric",
});

const yearLabel = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
});

function tehranWallMs(instant: Date | number): number {
  const ms = typeof instant === "number" ? instant : instant.getTime();
  return ms + TEHRAN_OFFSET_MS;
}

function fromWallMs(wallMs: number): Date {
  return new Date(wallMs - TEHRAN_OFFSET_MS);
}

function jalaaliOfWall(wallMs: number): JalaaliDateObject {
  const d = new Date(wallMs);
  return toJalaali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function weekStart(instant: Date): Date {
  const wall = new Date(tehranWallMs(instant));
  const daysSinceSaturday = (wall.getUTCDay() - 6 + 7) % 7;
  const startWall = Date.UTC(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate() - daysSinceSaturday,
  );
  return fromWallMs(startWall);
}

export function jalaliMonthStart(instant: Date): Date {
  const wall = new Date(tehranWallMs(instant));
  const j = jalaaliOfWall(wall.getTime());
  const g = toGregorian(j.jy, j.jm, 1);
  return fromWallMs(Date.UTC(g.gy, g.gm - 1, g.gd));
}

export function jalaliMonthAfter(instant: Date): Date {
  const wall = new Date(tehranWallMs(instant));
  const j = jalaaliOfWall(wall.getTime());
  const next = j.jm === 12 ? { jy: j.jy + 1, jm: 1 } : { jy: j.jy, jm: j.jm + 1 };
  const g = toGregorian(next.jy, next.jm, 1);
  return fromWallMs(Date.UTC(g.gy, g.gm - 1, g.gd));
}

export function jalaliYearStart(instant: Date): Date {
  const j = jalaaliOfWall(tehranWallMs(instant));
  const g = toGregorian(j.jy, 1, 1);
  return fromWallMs(Date.UTC(g.gy, g.gm - 1, g.gd));
}

export function jalaliYearAfter(instant: Date): Date {
  const j = jalaaliOfWall(tehranWallMs(instant));
  const g = toGregorian(j.jy + 1, 1, 1);
  return fromWallMs(Date.UTC(g.gy, g.gm - 1, g.gd));
}

export function jalaliKeyOf(instant: Date): { year: number; month: number } {
  const j = jalaaliOfWall(tehranWallMs(instant));
  return { year: j.jy, month: j.jm };
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

const WEEKS_IN_WINDOW = 12;
const MONTHS_IN_WINDOW = 12;
const YEARS_IN_WINDOW = 5;

export function buildBuckets(period: Period, now: Date = new Date()): TimeBucket[] {
  const buckets: TimeBucket[] = [];

  if (period === "weekly") {
    const current = weekStart(now);
    for (let i = WEEKS_IN_WINDOW - 1; i >= 0; i--) {
      const start = shiftDays(current, -7 * i);
      const end = shiftDays(start, 7);
      buckets.push({
        key: start.toISOString(),
        label: weekLabel.format(start),
        start,
        end,
      });
    }
    return buckets;
  }

  if (period === "monthly") {
    const starts: Date[] = [];
    let cursor = jalaliMonthStart(now);
    for (let i = 0; i < MONTHS_IN_WINDOW; i++) {
      starts.push(cursor);
      cursor = jalaliMonthStart(new Date(cursor.getTime() - 1));
    }
    starts.reverse();
    for (const start of starts) {
      buckets.push({
        key: start.toISOString(),
        label: monthLabel.format(start),
        start,
        end: jalaliMonthAfter(start),
      });
    }
    return buckets;
  }

  let yearCursor = jalaliYearStart(now);
  const yearStarts: Date[] = [];
  for (let i = 0; i < YEARS_IN_WINDOW; i++) {
    yearStarts.push(yearCursor);
    yearCursor = jalaliYearStart(new Date(yearCursor.getTime() - 1));
  }
  yearStarts.reverse();
  for (const start of yearStarts) {
    buckets.push({
      key: start.toISOString(),
      label: yearLabel.format(start),
      start,
      end: jalaliYearAfter(start),
    });
  }
  return buckets;
}

export function windowStart(buckets: TimeBucket[]): Date {
  const first = buckets[0];
  if (!first) throw new Error("buckets must not be empty");
  return first.start;
}
