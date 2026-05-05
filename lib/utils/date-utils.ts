import { format, parseISO, parse, differenceInCalendarDays } from "date-fns";

/**
 * Formats an ISO string ("2026-06-05") to "June 5, 2026".
 */
export function formatDate(dateStr: string, fmt: string = "MMMM d, yyyy"): string {
  return format(parseISO(dateStr), fmt);
}

/**
 * Returns the number of days from today to a given date.
 * Accepts a Date object, an ISO string, or a custom format string.
 * Positive = future, negative = past.
 *
 * @param date - Date object or date string
 * @param fmt  - Optional date-fns format string if date is not ISO (e.g. "dd/MM/yyyy")
 */
export function daysFromNow(date: Date | string, fmt?: string): number {
  const parsed =
    date instanceof Date
      ? date
      : fmt
      ? parse(date, fmt, new Date())
      : parseISO(date);

  return differenceInCalendarDays(parsed, new Date());
}

/**
 * Formats event start/end into a compact range.
 * Same day: "May 8, 7:00 PM - 10:30 PM"
 * Different day: "May 8, 7:00 PM - May 9, 1:00 AM"
 */
export function formatEventDateTimeRange(
  eventStart: string,
  eventEnd: string
): string {
  const start = parseISO(eventStart)
  const end = parseISO(eventEnd)

  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return `${format(start, "MMM d, h:mm a")} - ${format(end, "h:mm a")}`
  }

  return `${format(start, "MMM d, h:mm a")} - ${format(end, "MMM d, h:mm a")}`
}
