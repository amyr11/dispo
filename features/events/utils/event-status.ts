export type EventStatus = "Upcoming" | "Ongoing" | "Ended"

export function getEventStatus(
  eventStart: Date | string,
  eventEnd: Date | string,
  now: Date = new Date()
): EventStatus {
  const startAt = new Date(eventStart)
  const endAt = new Date(eventEnd)

  if (now < startAt) return "Upcoming"
  if (now <= endAt) return "Ongoing"
  return "Ended"
}
