import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { PublicEventCamera } from "@/features/events/components/public-event-camera"
import { NotFoundError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { publicEventAccess } from "@/features/events/server/public-access"
import { eventsService } from "@/features/events/server/service"
import { getEventStatus } from "@/features/events/utils/event-status"

export default async function PublicEventCameraPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  let eventIdNum: number
  try {
    eventIdNum = parseEventId(eventId)
  } catch (error) {
    if (error instanceof ValidationError) notFound()
    throw error
  }

  const event = await eventsService
    .getPublicEventById(eventIdNum)
    .catch((error) => {
      if (error instanceof NotFoundError) notFound()
      throw error
    })

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(
    publicEventAccess.cookieName(event.id)
  )?.value

  if (!publicEventAccess.hasAccess(event, accessToken)) {
    redirect(`/events/${event.id}/public`)
  }

  if (getEventStatus(event.eventStart) !== "Ongoing") {
    redirect(`/events/${event.id}/public`)
  }

  return <PublicEventCamera eventId={event.id} eventName={event.eventName} />
}
