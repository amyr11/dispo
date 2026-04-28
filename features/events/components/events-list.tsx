"use client"

import { useQuery } from "@tanstack/react-query"
import { getEvents } from "@/features/events/services/events-api"
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

export function EventsList() {
  const { data: eventsList = [] } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  })

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const sortedEvents = [...eventsList].sort((a, b) => {
    const aStart = new Date(a.eventStart)
    const bStart = new Date(b.eventStart)

    const getStatus = (start: Date) => {
      const day = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      )
      if (day.getTime() === today.getTime()) return 0 // ongoing
      if (day >= tomorrow) return 1 // upcoming
      return 2 // ended
    }

    const aStatus = getStatus(aStart)
    const bStatus = getStatus(bStart)

    if (aStatus !== bStatus) return aStatus - bStatus

    return aStart.getTime() - bStart.getTime()
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
