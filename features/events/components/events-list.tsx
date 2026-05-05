"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getEvent, getEvents, getEventStats } from "@/features/events/client/api"
import { eventQueryKeys } from "@/features/events/client/query-keys"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatEventDateTimeRange } from "@/lib/utils/date-utils"
import Link from "next/link"
import EventBadge from "./event-badge"
import Clickable from "@/components/ui/clickable"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  type EventStatus,
  getEventStatus,
} from "@/features/events/utils/event-status"

export function EventsList() {
  const queryClient = useQueryClient()
  const { data: eventsList = [], isLoading } = useQuery({
    queryKey: eventQueryKeys.list(),
    queryFn: getEvents,
    staleTime: 2 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`events-list-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-2 h-6 w-56 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  const now = new Date()

  const ongoingEvents = eventsList
    .filter(
    (event) =>
      getEventStatus(new Date(event.eventStart), new Date(event.eventEnd), now) ===
      "Ongoing"
  )
    .sort((a, b) => new Date(b.eventStart).getTime() - new Date(a.eventStart).getTime())
  const upcomingEvents = eventsList
    .filter(
    (event) =>
      getEventStatus(new Date(event.eventStart), new Date(event.eventEnd), now) ===
      "Upcoming"
  )
    .sort((a, b) => new Date(b.eventStart).getTime() - new Date(a.eventStart).getTime())
  const endedEvents = eventsList
    .filter(
    (event) =>
      getEventStatus(new Date(event.eventStart), new Date(event.eventEnd), now) ===
      "Ended"
  )
    .sort((a, b) => new Date(b.eventStart).getTime() - new Date(a.eventStart).getTime())

  if (eventsList.length === 0) {
    return (
      <p className="mt-4 text-center text-muted-foreground">
        It&apos;s quiet here 💤.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <EventSection
        title="Ongoing"
        events={ongoingEvents}
        queryClient={queryClient}
      />
      <EventSection
        title="Upcoming"
        events={upcomingEvents}
        queryClient={queryClient}
      />
      <EventSection
        title="Ended"
        events={endedEvents}
        queryClient={queryClient}
      />
    </div>
  )
}

type EventSectionProps = {
  title: EventStatus
  events: Array<{
    id: number
    eventName: string
    eventStart: string
    eventEnd: string
  }>
  queryClient: ReturnType<typeof useQueryClient>
}

function EventSection({ title, events, queryClient }: EventSectionProps) {
  if (events.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <EventBadge status={title} />
      {events.map((event) => (
        <Link
          href={`/dashboard/${event.id}`}
          key={event.id}
          onMouseEnter={() => {
            void queryClient.prefetchQuery({
              queryKey: eventQueryKeys.detail(event.id),
              queryFn: () => getEvent(event.id),
              staleTime: 2 * 60_000,
            })
            void queryClient.prefetchQuery({
              queryKey: eventQueryKeys.stats(event.id),
              queryFn: () => getEventStats(event.id),
              staleTime: 30_000,
            })
          }}
        >
          <Clickable>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{event.eventName}</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    className="size-3.5 text-muted-foreground"
                  />
                  <span>
                    {formatEventDateTimeRange(event.eventStart, event.eventEnd)}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </Clickable>
        </Link>
      ))}
    </section>
  )
}
