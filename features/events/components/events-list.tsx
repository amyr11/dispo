"use client"

import { useQuery } from "@tanstack/react-query"
import { getEvents } from "@/features/events/client/api"
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
  const { data: eventsList = [] } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
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
        <Link href={`/dashboard/${event.id}`} key={event.id}>
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
