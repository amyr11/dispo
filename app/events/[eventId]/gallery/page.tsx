import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Camera01Icon, UserGroup02Icon } from "@hugeicons/core-free-icons"
import { EventMetricCard } from "@/features/events/components/event-metric-card"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import { PublicEventGalleryClient } from "@/features/events/components/public-event-gallery-client"
import { PublicGalleryPasswordForm } from "@/features/events/components/public-gallery-password-form"
import { PublicGalleryRevealCountdown } from "@/features/events/components/public-gallery-reveal-countdown"
import { PublicNavbar } from "@/components/ui/public-navbar"
import { NotFoundError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { eventsService } from "@/features/events/server/service"
import { publicEventAccess } from "@/features/events/server/public-access"

export default async function EventGalleryPage({
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

  const now = new Date()
  const { event, photos } = await eventsService
    .getPublicEventGallery(eventIdNum)
    .catch((error) => {
      if (error instanceof NotFoundError) notFound()
      throw error
    })

  const cookieStore = await cookies()
  const galleryAccessToken = cookieStore.get(
    publicEventAccess.galleryCookieName(event.id)
  )?.value
  const hasGalleryAccess = publicEventAccess.hasAccess(event, galleryAccessToken)

  if (now < event.revealAt) {
    return (
      <div className="min-h-svh bg-muted">
        <PublicNavbar />
        <div className="mx-auto flex w-full max-w-lg flex-col px-4 pt-24 pb-12 sm:max-w-2xl">
          <PublicGalleryRevealCountdown
            eventName={event.eventName}
            eventStart={event.eventStart.toISOString()}
            eventEnd={event.eventEnd.toISOString()}
            revealAt={event.revealAt.toISOString()}
            initialNow={now.getTime()}
          />
        </div>
      </div>
    )
  }

  if (!hasGalleryAccess) {
    return (
      <div className="min-h-svh bg-muted">
        <PublicNavbar />
        <div className="mx-auto flex w-full max-w-lg flex-col px-4 pt-24 pb-12 sm:max-w-2xl">
          <PublicGalleryPasswordForm
            eventId={event.id}
            eventName={event.eventName}
            eventStart={event.eventStart.toISOString()}
            eventEnd={event.eventEnd.toISOString()}
          />
        </div>
      </div>
    )
  }

  const stats = await eventsService.getPublicEventStats(eventIdNum)

  return (
    <div className="min-h-svh bg-muted">
      <PublicNavbar />
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pt-24 pb-12 sm:max-w-2xl">
        <EventPageHeader
          eventStart={event.eventStart.toISOString()}
          eventEnd={event.eventEnd.toISOString()}
          eventName={event.eventName}
          titleTag="h1"
        />

        <section className="grid grid-cols-2 gap-3 py-8">
          <EventMetricCard
            icon={UserGroup02Icon}
            label="Attendees"
            value={stats.attendeesCount}
          />
          <EventMetricCard
            icon={Camera01Icon}
            label="Shots taken"
            value={stats.shotsCount}
          />
        </section>

        <PublicEventGalleryClient
          eventId={event.id}
          photos={photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            storagePath: photo.storagePath,
          }))}
        />
      </div>
    </div>
  )
}
