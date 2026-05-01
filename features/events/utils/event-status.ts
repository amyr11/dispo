export type EventStatus = "Upcoming" | "Ongoing" | "Ended"

export function getEventStartDay(eventStart: Date | string): Date {
  const start = new Date(eventStart)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate())
}

export function getToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function getEventStatus(
  eventStart: Date | string,
  now: Date = new Date()
): EventStatus {
  const startDay = getEventStartDay(eventStart)
  const today = getToday(now)

  if (startDay > today) return "Upcoming"
  if (startDay.getTime() === today.getTime()) return "Ongoing"
  return "Ended"
}
