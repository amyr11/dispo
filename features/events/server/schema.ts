import { ValidationError } from "@/features/events/server/errors"
import {
  CreateEventInput,
  JoinPublicEventInput,
  UpdateEventInput,
} from "@/features/events/server/types"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`)
  }
  return value.trim()
}

function asOptionalString(value: unknown, field: string): string | undefined {
  if (value == null) return undefined
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`)
  }
  return value.trim()
}

function asPositiveInt(value: unknown, field: string): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new ValidationError(`${field} must be a positive integer`)
  }
  return n
}

function asOptionalPositiveInt(
  value: unknown,
  field: string
): number | undefined {
  if (value == null) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new ValidationError(`${field} must be a positive integer`)
  }
  return n
}

function asISODate(value: unknown, field: string): string {
  const str = asString(value, field)
  const date = new Date(str)
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid date`)
  }
  return date.toISOString()
}

function asNickname(value: unknown): string {
  const nickname = asString(value, "nickname")
  if (nickname.length > 32) {
    throw new ValidationError("nickname must be 32 characters or less")
  }
  return nickname
}

function asUuid(value: unknown, field: string): string {
  const str = asString(value, field)
  if (!UUID_PATTERN.test(str)) {
    throw new ValidationError(`${field} must be a valid UUID`)
  }
  return str.toLowerCase()
}

function asOptionalISODate(value: unknown, field: string): string | undefined {
  if (value == null) return undefined
  return asISODate(value, field)
}

export function parseCreateEventInput(payload: unknown): CreateEventInput {
  const input = (payload ?? {}) as Record<string, unknown>

  return {
    eventName: asString(input.eventName, "eventName"),
    eventStart: asISODate(input.eventStart, "eventStart"),
    attendeeLimit: asPositiveInt(input.attendeeLimit, "attendeeLimit"),
    photoLimit: asPositiveInt(input.photoLimit, "photoLimit"),
    password: asString(input.password, "password"),
  }
}

export function parseUpdateEventInput(payload: unknown): UpdateEventInput {
  const input = (payload ?? {}) as Record<string, unknown>
  const parsed: UpdateEventInput = {
    eventName: asOptionalString(input.eventName, "eventName"),
    eventStart: asOptionalISODate(input.eventStart, "eventStart"),
    attendeeLimit: asOptionalPositiveInt(input.attendeeLimit, "attendeeLimit"),
    photoLimit: asOptionalPositiveInt(input.photoLimit, "photoLimit"),
    password: asOptionalString(input.password, "password"),
  }

  if (Object.values(parsed).every((value) => value === undefined)) {
    throw new ValidationError(
      "At least one field is required to update an event"
    )
  }

  return parsed
}

export function parsePublicEventPasswordInput(payload: unknown): string {
  const input = (payload ?? {}) as Record<string, unknown>
  return asString(input.password, "password")
}

export function parseJoinPublicEventInput(
  payload: unknown
): JoinPublicEventInput {
  const input = (payload ?? {}) as Record<string, unknown>

  return {
    password: asString(input.password, "password"),
    nickname: asNickname(input.nickname),
    fingerprint: asUuid(input.fingerprint, "fingerprint"),
  }
}
