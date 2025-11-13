import { describe, expect, it } from "vitest";
import {
  resolveDate,
  getTimestamp,
  getTimeDistanceMs,
  formatRelativeTime,
  formatAbsoluteTime,
  formatDateRange,
  isSameCalendarDay,
  isWithinMs,
} from "./date-utils";

describe("formatRelativeTime", () => {
  it("returns just now for timestamps within the threshold window", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const value = now.getTime() - 30_000;

    const result = formatRelativeTime(value, { now, locale: "en" });

    expect(result).toBe("just now");
  });

  it("formats past timestamps using Intl.RelativeTimeFormat semantics", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const ninetySecondsAgo = now.getTime() - 90_000;

    const expected = new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
      style: "narrow",
    }).format(-1, "minute");

    const result = formatRelativeTime(ninetySecondsAgo, { now, locale: "en" });

    expect(result).toBe(expected);
  });

  it("formats future timestamps using Intl.RelativeTimeFormat semantics", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const twoHoursAhead = now.getTime() + 2 * 60 * 60 * 1000;

    const expected = new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
      style: "narrow",
    }).format(2, "hour");

    const result = formatRelativeTime(twoHoursAhead, { now, locale: "en" });

    expect(result).toBe(expected);
  });
});

describe("formatAbsoluteTime", () => {
  it("formats absolute timestamps with provided locale and options", () => {
    const timestamp = "2024-05-20T15:45:00Z";

    const result = formatAbsoluteTime(timestamp, {
      locale: "en-US",
      timeZone: "UTC",
      hour12: false,
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    expect(result).toBe("May 20, 2024, 15:45");
  });

  it("falls back to ISO string when Intl.DateTimeFormat throws and no fallback provided", () => {
    const timestamp = "2024-05-20T15:45:00Z";
    const originalDateTimeFormat = Intl.DateTimeFormat;
    const throwingFactory = function () {
      throw new RangeError("format fail");
    } as unknown as typeof Intl.DateTimeFormat;

    (
      Intl as unknown as { DateTimeFormat: typeof Intl.DateTimeFormat }
    ).DateTimeFormat = throwingFactory;

    try {
      const result = formatAbsoluteTime(timestamp);

      expect(result).toBe(new Date(timestamp).toISOString());
    } finally {
      (
        Intl as unknown as { DateTimeFormat: typeof Intl.DateTimeFormat }
      ).DateTimeFormat = originalDateTimeFormat;
    }
  });

  it("uses provided fallback when Intl.DateTimeFormat throws", () => {
    const timestamp = "2024-05-20T15:45:00Z";
    const originalDateTimeFormat = Intl.DateTimeFormat;
    const throwingFactory = function () {
      throw new RangeError("format fail");
    } as unknown as typeof Intl.DateTimeFormat;

    (
      Intl as unknown as { DateTimeFormat: typeof Intl.DateTimeFormat }
    ).DateTimeFormat = throwingFactory;

    try {
      const result = formatAbsoluteTime(timestamp, {
        fallback: (date) => `Fallback ${date.getUTCFullYear()}`,
      });

      expect(result).toBe("Fallback 2024");
    } finally {
      (
        Intl as unknown as { DateTimeFormat: typeof Intl.DateTimeFormat }
      ).DateTimeFormat = originalDateTimeFormat;
    }
  });
});

describe("resolveDate & getTimestamp", () => {
  it("parses numeric strings into Date instances", () => {
    const numericTimestamp = 1_700_000_000_000;

    const resolved = resolveDate(String(numericTimestamp));

    expect(resolved).toBeInstanceOf(Date);
    expect(resolved.getTime()).toBe(numericTimestamp);
    expect(getTimestamp(resolved)).toBe(numericTimestamp);
  });

  it("throws for invalid inputs", () => {
    expect(() => resolveDate("not-a-date")).toThrowError(RangeError);
    expect(() => resolveDate("")).toThrowError(RangeError);
    expect(() => resolveDate({} as unknown as number)).toThrowError(TypeError);
  });
});

describe("getTimeDistanceMs", () => {
  it("computes signed and absolute differences between timestamps", () => {
    const a = "2024-01-01T00:01:00Z";
    const b = "2024-01-01T00:00:00Z";

    expect(getTimeDistanceMs(a, b)).toBe(60_000);
    expect(getTimeDistanceMs(b, a)).toBe(-60_000);
    expect(getTimeDistanceMs(b, a, { absolute: true })).toBe(60_000);
  });
});

describe("formatDateRange", () => {
  it("orders the range chronologically when start is after end", () => {
    const result = formatDateRange(
      "2024-01-05T10:00:00Z",
      "2024-01-03T10:00:00Z",
      {
        locale: "en-US",
        timeZone: "UTC",
        hour12: false,
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const jan03Index = result.indexOf("Jan 03");
    const jan05Index = result.indexOf("Jan 05");

    expect(jan03Index).not.toBe(-1);
    expect(jan05Index).not.toBe(-1);
    expect(jan03Index).toBeLessThan(jan05Index);
  });
});

describe("isSameCalendarDay", () => {
  it("compares dates within the same timezone-sensitive calendar day", () => {
    const tz = "America/New_York";

    const resultSameDay = isSameCalendarDay(
      "2024-01-01T03:00:00Z",
      "2024-01-01T04:59:59Z",
      tz,
    );
    const resultDifferentDay = isSameCalendarDay(
      "2024-01-01T03:00:00Z",
      "2024-01-01T12:00:00Z",
      tz,
    );

    expect(resultSameDay).toBe(true);
    expect(resultDifferentDay).toBe(false);
  });

  it("defaults to system locale when no timezone provided", () => {
    const first = "2024-07-04T12:00:00Z";
    const second = first;

    expect(isSameCalendarDay(first, second)).toBe(true);
  });
});

describe("isWithinMs", () => {
  it("checks whether two timestamps are within the provided threshold", () => {
    const base = 1_700_000_000_000;
    const target = base + 2_500;

    expect(isWithinMs(target, base, 3_000)).toBe(true);
    expect(isWithinMs(target, base, 2_000)).toBe(false);
  });
});
