"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import Clickable from "@/components/ui/clickable"
import EventBadge from "@/features/events/components/event-badge"
import StatsCard from "@/features/events/components/stats-card"
import {
  getAttendeesCount,
  getEvent,
  getShotsCount,
} from "@/features/events/services/event-services"
import { formatDate } from "@/lib/utils/date-utils"
import {
  ArrowLeft01Icon,
  UserGroup02Icon,
  Camera01Icon,
  QrCode01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { EditEventDialog } from "@/features/events/components/edit-event-dialog"
import { DeleteEventDialog } from "@/features/events/components/delete-event-dialog"
import { Event } from "@/features/events/types/event-types"
import { isFuture, isPast, isToday } from "date-fns"

export function EventDashboardClient({
  eventId,
  initialEvent,
  initialAttendeesCount,
  initialShotsCount,
}: {
  eventId: number
  initialEvent: Event
  initialAttendeesCount: number
  initialShotsCount: number
}) {
  const { data: event = initialEvent } = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => getEvent(eventId),
    initialData: initialEvent,
  })

  const { data: attendeesCount = initialAttendeesCount } = useQuery({
    queryKey: ["attendees", eventId],
    queryFn: () => getAttendeesCount(eventId),
    initialData: initialAttendeesCount,
  })

  const { data: shotsCount = initialShotsCount } = useQuery({
    queryKey: ["shots", eventId],
    queryFn: () => getShotsCount(eventId),
    initialData: initialShotsCount,
  })

  return (
    <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <DeleteEventDialog eventId={event.id} />
          <div hidden={isPast(event.eventStart)}>
            <EditEventDialog event={event} />
          </div>
          <Button variant="default">
            <HugeiconsIcon icon={QrCode01Icon} size={16} />
            Share
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b py-8">
        <EventBadge eventStart={event.eventStart} />
        <p className="font-heading text-2xl">{event.eventName}</p>
        <p className="text-sm">{formatDate(event.eventStart)}</p>
      </div>
      <div className="flex flex-col gap-2 py-8 sm:flex-row">
        <Clickable disabled={!isPast(event.eventStart)}>
          <Link href="#">
            <StatsCard
              icon={UserGroup02Icon}
              label="Attendees"
              value={attendeesCount}
              limit={event.attendeeLimit}
            />
          </Link>
        </Clickable>
        <Clickable disabled={!isPast(event.revealAt)}>
          <Link href="#">
            <StatsCard
              icon={Camera01Icon}
              label="Shots taken"
              value={shotsCount}
              limit={event.photoLimit * event.attendeeLimit}
            />
          </Link>
        </Clickable>
      </div>
    </div>
  )
}
