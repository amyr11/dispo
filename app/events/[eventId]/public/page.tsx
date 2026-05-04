import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import {
  CalendarOffIcon,
  Camera01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { EventMetricCard } from "@/features/events/components/event-metric-card"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import { PublicEventCountdown } from "@/features/events/components/public-event-countdown"
import { PublicEventTakePhotosPanel } from "@/features/events/components/public-event-take-photos-panel"
import { PublicEventPasswordForm } from "@/features/events/components/public-event-password-form"
import { NotFoundError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { publicEventAccess } from "@/features/events/server/public-access"
import { eventsService } from "@/features/events/server/service"
import {
  getEventStartDay,
  getEventStatus,
} from "@/features/events/utils/event-status"

function PublicEventFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh justify-center bg-muted">
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        {children}
      </div>
    </div>
  )
}

function PublicEventEndedNotice({
  eventName,
  eventStart,
}: {
  eventName: string
  eventStart: string
}) {
  return (
    <div className="flex w-full flex-col gap-8">
      <EventPageHeader eventStart={eventStart} eventName={eventName} />

      <section className="flex w-full max-w-xs flex-col gap-2">
        <HugeiconsIcon
          icon={CalendarOffIcon}
          className="size-8 text-muted-foreground"
        />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium">Event ended</h1>
          <p className="text-sm text-muted-foreground">
            This event is no longer open to the public.
          </p>
        </div>
      </section>
    </div>
  )
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>
  searchParams?: Promise<{ limitReached?: string; cameraError?: string }>
}) {
  const { eventId } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const hasLimitReachedNotice = resolvedSearchParams.limitReached === "1"
  const hasMissingAttendeeNotice =
    resolvedSearchParams.cameraError === "missing-attendee"

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
  const eventStart = event.eventStart.toISOString()
  const now = new Date()
  const eventStatus = getEventStatus(eventStart, now)

  if (eventStatus === "Upcoming") {
    return (
      <PublicEventFrame>
        <PublicEventCountdown
          eventName={event.eventName}
          eventStart={eventStart}
          initialNow={now.getTime()}
          targetAt={getEventStartDay(eventStart).getTime()}
        />
      </PublicEventFrame>
    )
  }

  if (eventStatus === "Ended") {
    return (
      <PublicEventFrame>
        <PublicEventEndedNotice
          eventName={event.eventName}
          eventStart={eventStart}
        />
      </PublicEventFrame>
    )
  }

  const hasAccess = publicEventAccess.hasAccess(event, accessToken)

  if (!hasAccess) {
    return (
      <PublicEventFrame>
        <PublicEventPasswordForm
          eventId={event.id}
          eventName={event.eventName}
          eventStart={eventStart}
        />
      </PublicEventFrame>
    )
  }

  const stats = await eventsService.getPublicEventStats(event.id)

  return (
    <PublicEventFrame>
      <EventPageHeader
        eventStart={eventStart}
        eventName={event.eventName}
        titleTag="h1"
      />

      <section className="grid grid-cols-2 gap-3 py-8">
        <EventMetricCard
          icon={UserGroup02Icon}
          label="Attendees"
          value={stats.attendeesCount}
          caption={`Max. of ${event.attendeeLimit}`}
        />
        <EventMetricCard
          icon={Camera01Icon}
          label="Shots taken"
          value={stats.shotsCount}
          caption={`Max. of ${event.photoLimit} per person`}
        />
      </section>

      {hasMissingAttendeeNotice && (
        <p className="pt-4 text-center text-sm text-destructive">
          Attendee session missing. Rejoin the event before taking photos.
        </p>
      )}

      <PublicEventTakePhotosPanel
        eventId={event.id}
        photoLimit={event.photoLimit}
        revealAt={event.revealAt.toISOString()}
        limitReachedNotice={hasLimitReachedNotice}
      />
    </PublicEventFrame>
  )
}
