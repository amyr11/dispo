import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft01Icon, Camera01Icon, UserGroup02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import EventBadge from "@/features/events/components/event-badge"
import { OwnerEventGalleryClient } from "@/features/events/components/owner-event-gallery-client"
import { PublicGalleryRevealCountdown } from "@/features/events/components/public-gallery-reveal-countdown"
import { NotFoundError, UnauthorizedError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { eventsService } from "@/features/events/server/service"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/utils/date-utils"

type OwnerStatCardProps = {
  icon: IconSvgElement
  label: string
  value: number
}

function OwnerStatCard({ icon, label, value }: OwnerStatCardProps) {
  return (
    <Card className="items-center gap-2 px-4 py-5 text-center">
      <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
      <p className="font-heading text-4xl leading-none font-semibold">{value}</p>
      <p className="text-sm">{label}</p>
    </Card>
  )
}

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

  const { event, photos } = await eventsService
    .getOwnerEventGallery(userId, eventIdNum)
    .catch((error) => {
      if (error instanceof NotFoundError) notFound()
      throw error
    })

  const stats = await eventsService.getEventStats(userId, eventIdNum)
  const now = new Date()

  if (now < event.revealAt) {
    return (
      <div className="flex min-h-svh flex-col items-center bg-muted">
        <Navbar />
        <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
          <div className="mb-8">
            <Link href={`/dashboard/${event.id}`}>
              <Button variant="outline" size="icon">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              </Button>
            </Link>
          </div>
          <PublicGalleryRevealCountdown
            eventName={event.eventName}
            eventStart={event.eventStart.toISOString()}
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
        <div className="mb-8">
          <Link href={`/dashboard/${event.id}`}>
            <Button variant="outline" size="icon">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            </Button>
          </Link>
        </div>
        <header className="flex flex-col gap-2 border-b pb-8">
          <EventBadge eventStart={event.eventStart.toISOString()} />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold">{event.eventName}</h1>
            <p className="text-sm">{formatDate(event.eventStart.toISOString())}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 py-8">
          <OwnerStatCard icon={UserGroup02Icon} label="Attendees" value={stats.attendeesCount} />
          <OwnerStatCard icon={Camera01Icon} label="Shots taken" value={stats.shotsCount} />
        </section>

        <OwnerEventGalleryClient
          eventId={event.id}
          photos={photos.map((photo) => ({ id: photo.id, url: photo.url }))}
        />
      </div>
    </div>
  )
}
