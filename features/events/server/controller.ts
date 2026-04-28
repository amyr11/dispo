import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { eventsService } from "@/features/events/server/service"
import { NotFoundError, UnauthorizedError, ValidationError } from "@/features/events/server/errors"
import { parseCreateEventInput, parseUpdateEventInput } from "@/features/events/server/schema"

function parseEventId(eventIdParam: string): number {
  const eventId = Number(eventIdParam)
  if (!Number.isInteger(eventId) || eventId < 1) {
    throw new ValidationError("Invalid event ID")
  }
  return eventId
}

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new UnauthorizedError()
  }

  return user.id
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export async function listEventsController() {
  try {
    const userId = await getCurrentUserId()
    const events = await eventsService.listEvents(userId)
    return NextResponse.json(events)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function createEventController(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const payload = await req.json()
    const input = parseCreateEventInput(payload)
    const event = await eventsService.createEvent(userId, input)
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function getEventController(eventIdParam: string) {
  try {
    const userId = await getCurrentUserId()
    const eventId = parseEventId(eventIdParam)
    const event = await eventsService.getEventById(userId, eventId)
    return NextResponse.json(event)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function updateEventController(req: Request, eventIdParam: string) {
  try {
    const userId = await getCurrentUserId()
    const eventId = parseEventId(eventIdParam)
    const payload = await req.json()
    const input = parseUpdateEventInput(payload)
    const event = await eventsService.updateEvent(userId, eventId, input)
    return NextResponse.json(event)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function deleteEventController(eventIdParam: string) {
  try {
    const userId = await getCurrentUserId()
    const eventId = parseEventId(eventIdParam)
    await eventsService.deleteEvent(userId, eventId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function getEventStatsController(eventIdParam: string) {
  try {
    const userId = await getCurrentUserId()
    const eventId = parseEventId(eventIdParam)
    const stats = await eventsService.getEventStats(userId, eventId)
    return NextResponse.json(stats)
  } catch (error) {
    return toErrorResponse(error)
  }
}
