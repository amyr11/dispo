"use client"

import { useQuery } from "@tanstack/react-query"
import { getEvents } from "@/features/events/services/events-util"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/utils/date-utils"
import Link from "next/link"
import EventBadge from "./event-badge"

export function EventsList() {
  const { data: eventsList = [] } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  })

  const sortedEvents = [...eventsList].sort(
    (a, b) =>
      new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()
  )

  if (eventsList.length === 0) {
    return (
      <p className="mt-4 text-center text-muted-foreground">
        It&apos;s quiet here 💤.
      </p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {sortedEvents.map((event) => (
        <Link href={`/dashboard/${event.id}`} key={event.id}>
          <Card className="cursor-pointer transition-all active:scale-95">
            <CardHeader>
              <EventBadge eventStart={event.eventStart} />
              <CardTitle className="mt-2 text-lg">{event.eventName}</CardTitle>
              <CardDescription>{formatDate(event.eventStart)}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
