import { NextResponse } from "next/server"
import { parseEventId } from "@/features/events/server/params"
import { eventsService } from "@/features/events/server/service"
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/features/events/server/errors"
import { parsePublicEventPasswordInput } from "@/features/events/server/schema"
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
    const password = parsePublicEventPasswordInput(payload)
    const event = await eventsService.verifyPublicGalleryPassword(
      eventIdNum,
      password
    )

    const response = NextResponse.json({ success: true })
    response.cookies.set(
      publicEventAccess.galleryCookieName(event.id),
      publicEventAccess.createToken(event),
      {
        httpOnly: true,
        maxAge: PUBLIC_EVENT_ACCESS_MAX_AGE,
        path: `/events/${event.id}/gallery`,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      }
    )

    return response
  } catch (error) {
    return toErrorResponse(error)
  }
}
