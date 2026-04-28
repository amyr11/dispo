import { ValidationError } from "@/features/events/server/errors"
import { CreateEventInput, UpdateEventInput } from "@/features/events/server/types"

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

function asOptionalPositiveInt(value: unknown, field: string): number | undefined {
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
    throw new ValidationError("At least one field is required to update an event")
  }

  return parsed
}
