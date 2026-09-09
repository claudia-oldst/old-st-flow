import { format as fnsFormat } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * The reporting timezone used for all client-facing boundaries:
 * client portal, client report and project export.
 * Internal logs keep their own logger-local time; only client/roll-up
 * boundaries use this zone.
 */
export const REPORTING_TZ = "Europe/London";

/** The start (00:00:00.000) of the given date as it falls in REPORTING_TZ. */
export function startOfDayInTz(d: Date, tz: string = REPORTING_TZ): Date {
  const zoned = toZonedTime(d, tz);
  const atMidnight = new Date(zoned);
  atMidnight.setHours(0, 0, 0, 0);
  return fromZonedTime(atMidnight, tz);
}

/** The end (23:59:59.999) of the given date as it falls in REPORTING_TZ. */
export function endOfDayInTz(d: Date, tz: string = REPORTING_TZ): Date {
  const zoned = toZonedTime(d, tz);
  const atEnd = new Date(zoned);
  atEnd.setHours(23, 59, 59, 999);
  return fromZonedTime(atEnd, tz);
}

/** Format a Date in the reporting timezone. */
export function formatInTz(
  d: Date,
  fmt: string,
  tz: string = REPORTING_TZ,
): string {
  return fnsFormat(toZonedTime(d, tz), fmt);
}

/**
 * End of the UK day for a calendar selection. When the selected day is today
 * (in UK time) and "now" is earlier than end-of-day, return now so the snapshot
 * reflects everything logged so far rather than a future 23:59.
 */
export function reportingEndOfDay(d: Date, now: Date = new Date()): Date {
  const end = endOfDayInTz(d);
  const todayEnd = endOfDayInTz(now);
  if (end.getTime() === todayEnd.getTime() && now.getTime() < end.getTime()) {
    return now;
  }
  return end;
}
