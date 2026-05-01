import { ValidationError } from "@/features/events/server/errors"

export function parseEventId(eventIdParam: string): number {
  const eventId = Number(eventIdParam)
  if (!Number.isInteger(eventId) || eventId < 1) {
    throw new ValidationError("Invalid event ID")
  }
  return eventId
}
