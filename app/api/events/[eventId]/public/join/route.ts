import { NextResponse } from "next/server"
import { parseEventId } from "@/features/events/server/params"
import { eventsService } from "@/features/events/server/service"
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/features/events/server/errors"
import { parseJoinPublicEventInput } from "@/features/events/server/schema"
import {
  PUBLIC_EVENT_ACCESS_MAX_AGE,
  publicEventAccess,
} from "@/features/events/server/public-access"

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await ctx.params
    const eventIdNum = parseEventId(eventId)
    const payload = await req.json().catch(() => {
      throw new ValidationError("Invalid JSON body")
    })
    const input = parseJoinPublicEventInput(payload)
    const { event, attendee } = await eventsService.joinPublicEvent(
      eventIdNum,
      input
    )

    const response = NextResponse.json({ attendee }, { status: 201 })
    response.cookies.set(
      publicEventAccess.cookieName(event.id),
      publicEventAccess.createToken(event),
      {
        httpOnly: true,
        maxAge: PUBLIC_EVENT_ACCESS_MAX_AGE,
        path: `/events/${event.id}/public`,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      }
    )

    return response
  } catch (error) {
    return toErrorResponse(error)
  }
}
