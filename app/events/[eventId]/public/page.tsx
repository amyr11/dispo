import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Camera01Icon, UserGroup02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import EventBadge from "@/features/events/components/event-badge"
import { PublicEventPasswordForm } from "@/features/events/components/public-event-password-form"
import { NotFoundError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { publicEventAccess } from "@/features/events/server/public-access"
import { eventsService } from "@/features/events/server/service"
import { formatDate } from "@/lib/utils/date-utils"

type PublicStatCardProps = {
  icon: IconSvgElement
  label: string
  value: number
  caption: string
}

function PublicStatCard({ icon, label, value, caption }: PublicStatCardProps) {
  return (
    <Card className="items-center gap-2 px-4 py-5 text-center">
      <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
      <p className="font-heading text-4xl leading-none font-semibold">
        {value}
      </p>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </Card>
  )
}

export default async function PublicEventPage({
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
  const hasAccess = publicEventAccess.hasAccess(event, accessToken)
  const eventStart = event.eventStart.toISOString()

  if (!hasAccess) {
    return (
      <div className="flex min-h-svh justify-center bg-muted">
        <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
          <PublicEventPasswordForm
            eventId={event.id}
            eventName={event.eventName}
            eventStart={eventStart}
          />
        </div>
      </div>
    )
  }

  const stats = await eventsService.getPublicEventStats(event.id)

  return (
    <div className="flex min-h-svh justify-center bg-muted">
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <header className="flex flex-col gap-2 border-b pb-8">
          <EventBadge eventStart={eventStart} />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold">
              {event.eventName}
            </h1>
            <p className="text-sm">{formatDate(eventStart)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 py-8">
          <PublicStatCard
            icon={UserGroup02Icon}
            label="Attendees"
            value={stats.attendeesCount}
            caption={`Max. of ${event.attendeeLimit}`}
          />
          <PublicStatCard
            icon={Camera01Icon}
            label="Shots taken"
            value={stats.shotsCount}
            caption={`Max. of ${event.photoLimit} per person`}
          />
        </section>

        <section className="flex flex-col items-center gap-4 pt-6 text-center">
          <p className="text-xl">Start making memories!</p>
          <Button type="button" className="w-40">
            <HugeiconsIcon icon={Camera01Icon} size={16} />
            Take photos
          </Button>
          <div className="flex flex-col items-center gap-1">
            <p className="font-heading text-5xl leading-none font-semibold">
              0
              <span className="ml-1 text-base font-normal">
                / {event.photoLimit}
              </span>
            </p>
            <p className="text-sm">Shots taken</p>
          </div>
        </section>
      </div>
    </div>
  )
}
