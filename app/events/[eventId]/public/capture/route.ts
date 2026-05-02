import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { parseEventId } from "@/features/events/server/params"
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/features/events/server/errors"
import {
  parsePublicPhotoCaptureFormData,
  parsePublicPhotoFingerprint,
} from "@/features/events/server/schema"
import { publicEventAccess } from "@/features/events/server/public-access"
import { eventsService } from "@/features/events/server/service"

const MAX_FILE_BYTES = 12 * 1024 * 1024
const PHOTO_LIMIT_ERROR_MESSAGE = "You have reached the photo limit for this event"

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (error instanceof ConflictError) {
    if (error.message === PHOTO_LIMIT_ERROR_MESSAGE) {
      return NextResponse.json(
        { error: error.message, code: "PHOTO_LIMIT_REACHED" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error.message, code: "CAPTURE_CONFLICT" },
      { status: 409 }
    )
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

async function assertPublicEventAccess(eventIdNum: number) {
  const event = await eventsService.getPublicEventById(eventIdNum)
  const cookieStore = await cookies()
  const token = cookieStore.get(publicEventAccess.cookieName(event.id))?.value

  if (!publicEventAccess.hasAccess(event, token)) {
    throw new UnauthorizedError("Public event access is required")
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await ctx.params
    const eventIdNum = parseEventId(eventId)
    await assertPublicEventAccess(eventIdNum)

    const url = new URL(req.url)
    const fingerprint = parsePublicPhotoFingerprint(
      url.searchParams.get("fingerprint")
    )
    const attendeeState = await eventsService.getPublicAttendeeCaptureState(
      eventIdNum,
      fingerprint
    )

    return NextResponse.json({
      photosTaken: attendeeState.shotsTaken,
      photoLimit: attendeeState.photoLimit,
      photosLeft: Math.max(0, attendeeState.photoLimit - attendeeState.shotsTaken),
      revealAt: attendeeState.revealAt.toISOString(),
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await ctx.params
    const eventIdNum = parseEventId(eventId)
    await assertPublicEventAccess(eventIdNum)

    const formData = await req.formData()
    const input = parsePublicPhotoCaptureFormData(formData)

    if (input.file.size > MAX_FILE_BYTES) {
      throw new ValidationError("Photo file is too large")
    }

    if (!input.file.type.startsWith("image/")) {
      throw new ValidationError("Invalid photo file type")
    }

    const result = await eventsService.capturePublicEventPhoto(eventIdNum, input)

    return NextResponse.json({
      photosTaken: result.shotsTaken,
      photoLimit: result.photoLimit,
      photosLeft: Math.max(0, result.photoLimit - result.shotsTaken),
      reachedLimit: result.shotsTaken >= result.photoLimit,
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
