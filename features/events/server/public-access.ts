import { createHmac, timingSafeEqual } from "node:crypto"
import { EventRecord } from "@/features/events/server/types"

export const PUBLIC_EVENT_ACCESS_MAX_AGE = 60 * 60 * 24 * 7

function tokenPayload(event: EventRecord): string {
  return `${event.id}:${event.userId}:${event.createdAt.getTime()}`
}

function createToken(event: EventRecord): string {
  return createHmac("sha256", event.password)
    .update(tokenPayload(event))
    .digest("hex")
}

function isEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)

  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  )
}

export const publicEventAccess = {
  cookieName(eventId: number) {
    return `dispo_public_event_${eventId}`
  },

  createToken,

  hasAccess(event: EventRecord, token?: string) {
    if (!token) return false
    return isEqual(token, createToken(event))
  },
}
