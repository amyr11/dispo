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
import { formatDate } from "@/lib/utils/date-utils"
import Link from "next/link"
import EventBadge from "./event-badge"
import Clickable from "@/components/ui/clickable"
import {
  getEventStartDay,
  getEventStatus,
} from "@/features/events/utils/event-status"

export function EventsList() {
  const queryClient = useQueryClient()
  const { data: eventsList = [] } = useQuery({
    queryKey: eventQueryKeys.list(),
    queryFn: getEvents,
    staleTime: 2 * 60_000,
  })

  const now = new Date()

  const sortedEvents = [...eventsList].sort((a, b) => {
    const aStart = new Date(a.eventStart)
    const bStart = new Date(b.eventStart)

    const getStatus = (start: Date) => {
      const status = getEventStatus(start, now)
      if (status === "Ongoing") return 0
      if (status === "Upcoming") return 1
      return 2
    }

    const aStatus = getStatus(aStart)
    const bStatus = getStatus(bStart)

    if (aStatus !== bStatus) return aStatus - bStatus

    return (
      getEventStartDay(aStart).getTime() - getEventStartDay(bStart).getTime()
    )
  })

  if (eventsList.length === 0) {
    return (
      <p className="mt-4 text-center text-muted-foreground">
        It&apos;s quiet here 💤.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedEvents.map((event) => (
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
                <EventBadge eventStart={event.eventStart} />
                <CardTitle className="mt-2 text-lg">
                  {event.eventName}
                </CardTitle>
                <CardDescription>
                  {formatDate(event.eventStart)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Clickable>
        </Link>
      ))}
    </div>
  )
}
