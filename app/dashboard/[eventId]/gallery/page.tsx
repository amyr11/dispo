import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft01Icon, Camera01Icon, UserGroup02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { EventMetricCard } from "@/features/events/components/event-metric-card"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import { OwnerEventGalleryClient } from "@/features/events/components/owner-event-gallery-client"
import { PublicGalleryRevealCountdown } from "@/features/events/components/public-gallery-reveal-countdown"
import { NotFoundError, UnauthorizedError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { eventsService } from "@/features/events/server/service"
import { createClient } from "@/lib/supabase/server"

async function getCurrentUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new UnauthorizedError()
  }

  return user.id
}

export default async function OwnerEventGalleryPage({
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

  const userId = await getCurrentUserId().catch(() => notFound())

  const [ownerGallery, stats] = await Promise.all([
    eventsService.getOwnerEventGallery(userId, eventIdNum).catch((error) => {
      if (error instanceof NotFoundError) notFound()
      throw error
    }),
    eventsService.getEventStats(userId, eventIdNum),
  ])
  const { event, photos } = ownerGallery
  const now = new Date()

  if (now < event.revealAt) {
    return (
      <div className="flex min-h-svh flex-col items-center bg-muted">
        <Navbar />
        <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <Link href={`/dashboard/${event.id}`}>
              <Button variant="outline" size="icon">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">Dashboard / Shots taken</p>
          </div>
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

  return (
    <div className="flex min-h-svh flex-col items-center bg-muted">
      <Navbar />
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Link href={`/dashboard/${event.id}`}>
            <Button variant="outline" size="icon">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">Dashboard / Shots taken</p>
        </div>
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

        <OwnerEventGalleryClient
          eventId={event.id}
          photos={photos.map((photo) => ({ id: photo.id, url: photo.url }))}
        />
      </div>
    </div>
  )
}
