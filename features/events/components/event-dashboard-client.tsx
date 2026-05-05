"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Clickable from "@/components/ui/clickable"
import { CountdownPanel } from "@/features/events/components/countdown-panel"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import StatsCard from "@/features/events/components/stats-card"
import { getEvent, getEventStats } from "@/features/events/client/api"
import { eventQueryKeys } from "@/features/events/client/query-keys"
import { formatDate } from "@/lib/utils/date-utils"
import {
  ArrowLeft01Icon,
  UserGroup02Icon,
  Camera01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { EditEventDialog } from "@/features/events/components/edit-event-dialog"
import { DeleteEventDialog } from "@/features/events/components/delete-event-dialog"
import { ShareEventDialog } from "@/features/events/components/share-event-dialog"
import { getEventStatus } from "@/features/events/utils/event-status"
import { Skeleton } from "@/components/ui/skeleton"

function EventDashboardContentSkeleton() {
  return (
    <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
      <div className="flex items-center justify-between">
        <Skeleton className="size-7" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b py-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-2 py-8 sm:flex-row">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  )
}

export function EventDashboardClient({ eventId }: { eventId: number }) {
  const router = useRouter()
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: eventQueryKeys.detail(eventId),
    queryFn: () => getEvent(eventId),
    staleTime: 2 * 60_000,
  })

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: eventQueryKeys.stats(eventId),
    queryFn: () => getEventStats(eventId),
    staleTime: 30_000,
  })

  const eventStatus = event
    ? getEventStatus(event.eventStart, event.eventEnd)
    : null
  const isUpcoming = eventStatus === "Upcoming"

  if (isEventLoading || !event || isStatsLoading || !stats) {
    return <EventDashboardContentSkeleton />
  }

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
          <EditEventDialog event={event} />
          {eventStatus !== "Ended" && (
            <ShareEventDialog
              eventId={event.id}
              eventName={event.eventName}
              eventStart={event.eventStart}
              eventEnd={event.eventEnd}
            />
          )}
        </div>
      </div>
      <div className="pt-8">
        <EventPageHeader
          eventStart={event.eventStart}
          eventEnd={event.eventEnd}
          eventName={event.eventName}
        />
      </div>
      {!isUpcoming && (
        <div className="flex flex-col gap-2 py-8 sm:flex-row">
          <Clickable>
            <Link
              href={`/dashboard/${event.id}/attendees`}
              onMouseEnter={() => {
                router.prefetch(`/dashboard/${event.id}/attendees`)
              }}
              onTouchStart={() => {
                router.prefetch(`/dashboard/${event.id}/attendees`)
              }}
            >
              <StatsCard
                icon={UserGroup02Icon}
                label="Attendees"
                value={stats.attendeesCount}
                limit={event.attendeeLimit}
              />
            </Link>
          </Clickable>
          <Clickable>
            <Link
              href={`/dashboard/${event.id}/gallery`}
              onMouseEnter={() => {
                router.prefetch(`/dashboard/${event.id}/gallery`)
              }}
              onTouchStart={() => {
                router.prefetch(`/dashboard/${event.id}/gallery`)
              }}
            >
              <StatsCard
                icon={Camera01Icon}
                label="Shots taken"
                value={stats.shotsCount}
                limit={event.photoLimit * event.attendeeLimit}
              />
            </Link>
          </Clickable>
        </div>
      )}
      {isUpcoming && (
        <CountdownPanel
          className="flex w-full max-w-md flex-col gap-5 py-8"
          targetAt={new Date(event.eventStart).getTime()}
          title="Countdown to event start"
          description={`Stats unlock on ${formatDate(event.eventStart, "MMMM d, yyyy h:mm a")}.`}
        />
      )}
    </div>
  )
}
