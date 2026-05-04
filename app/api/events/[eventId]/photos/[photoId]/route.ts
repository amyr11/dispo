import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { eventsService } from "@/features/events/server/service"
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"

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

export async function DELETE(
  _: Request,
  ctx: { params: Promise<{ eventId: string; photoId: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { eventId, photoId } = await ctx.params
    const eventIdNum = parseEventId(eventId)

    try {
      BigInt(photoId)
    } catch {
      throw new ValidationError("Invalid photo id")
    }

    await eventsService.softDeleteOwnerEventPhoto(userId, eventIdNum, photoId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
