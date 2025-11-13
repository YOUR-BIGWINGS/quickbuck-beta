// Shared date formatting utilities for client UI.
// These helpers intentionally avoid browser-only APIs so they can run in SSR and during tests.

export type DateInput = Date | number | string;

type ResolvedDateResult = { date: Date; timestamp: number };

const RELATIVE_TIME_DIVISIONS: ReadonlyArray<{
  amount: number;
  unit: Intl.RelativeTimeFormatUnit;
}> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

function normalizeDateInput(
  value: DateInput,
  label = "value",
): ResolvedDateResult {
  let date: Date;

  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new RangeError(`Cannot parse empty string for "${label}".`);
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const numericDate = new Date(Number(trimmed));
      if (!Number.isNaN(numericDate.getTime())) {
        date = numericDate;
      } else {
        date = new Date(trimmed);
      }
    } else {
      date = new Date(trimmed);
    }
  } else {
    throw new TypeError(`Unsupported date input type for "${label}".`);
  }

  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    throw new RangeError(`Invalid date provided for "${label}".`);
  }

  return { date, timestamp };
}

export function resolveDate(value: DateInput, label = "value"): Date {
  return normalizeDateInput(value, label).date;
}

export function getTimestamp(value: DateInput, label = "value"): number {
  return normalizeDateInput(value, label).timestamp;
}

export interface TimeDistanceOptions {
  absolute?: boolean;
}

export function getTimeDistanceMs(
  a: DateInput,
  b: DateInput,
  options: TimeDistanceOptions = {},
): number {
  const diff = getTimestamp(a, "a") - getTimestamp(b, "b");
  return options.absolute ? Math.abs(diff) : diff;
}

export interface RelativeTimeOptions {
  now?: DateInput;
  locale?: string | string[];
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
  justNowThresholdMs?: number;
  justNowLabel?: string;
}

export function formatRelativeTime(
  value: DateInput,
  {
    now = Date.now(),
    locale,
    numeric = "auto",
    style = "narrow",
    justNowThresholdMs = 60_000,
    justNowLabel = "just now",
  }: RelativeTimeOptions = {},
): string {
  const target = normalizeDateInput(value, "value");
  const reference = normalizeDateInput(now, "now");
  const deltaMs = target.timestamp - reference.timestamp;

  if (Math.abs(deltaMs) <= justNowThresholdMs) {
    return justNowLabel;
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric, style });

  let deltaInSeconds = deltaMs / 1000;
  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(deltaInSeconds) < division.amount) {
      return formatter.format(Math.round(deltaInSeconds), division.unit);
    }
    deltaInSeconds /= division.amount;
  }

  return formatter.format(Math.round(deltaInSeconds), "year");
}

export interface AbsoluteTimeOptions extends Intl.DateTimeFormatOptions {
  locale?: string | string[];
  fallback?: (date: Date) => string;
}

const ABSOLUTE_TIME_DEFAULTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function formatAbsoluteTime(
  value: DateInput,
  { locale, fallback, ...intlOptions }: AbsoluteTimeOptions = {},
): string {
  const { date } = normalizeDateInput(value, "value");

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      ...ABSOLUTE_TIME_DEFAULTS,
      ...intlOptions,
    });
    return formatter.format(date);
  } catch (error) {
    if (fallback) {
      return fallback(date);
    }
    return date.toISOString();
  }
}

export interface DateRangeFormatOptions extends Intl.DateTimeFormatOptions {
  locale?: string | string[];
  delimiter?: string;
  fallback?: (start: Date, end: Date) => string;
}

export function formatDateRange(
  start: DateInput,
  end: DateInput,
  {
    locale,
    delimiter = " – ",
    fallback,
    ...intlOptions
  }: DateRangeFormatOptions = {},
): string {
  const startResult = normalizeDateInput(start, "start");
  const endResult = normalizeDateInput(end, "end");

  let rangeStart = startResult.date;
  let rangeEnd = endResult.date;

  if (startResult.timestamp > endResult.timestamp) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      ...ABSOLUTE_TIME_DEFAULTS,
      ...intlOptions,
    });

    if (typeof formatter.formatRange === "function") {
      return formatter.formatRange(rangeStart, rangeEnd);
    }

    return `${formatter.format(rangeStart)}${delimiter}${formatter.format(rangeEnd)}`;
  } catch (error) {
    if (fallback) {
      return fallback(rangeStart, rangeEnd);
    }
    return `${rangeStart.toISOString()}${delimiter}${rangeEnd.toISOString()}`;
  }
}

export function isSameCalendarDay(
  a: DateInput,
  b: DateInput,
  timeZone?: string,
): boolean {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  };

  const formatter = new Intl.DateTimeFormat(undefined, options);
  return (
    formatter.format(resolveDate(a, "a")) ===
    formatter.format(resolveDate(b, "b"))
  );
}

export function isWithinMs(
  target: DateInput,
  reference: DateInput,
  thresholdMs: number,
): boolean {
  return (
    Math.abs(getTimeDistanceMs(target, reference)) <= Math.abs(thresholdMs)
  );
}
