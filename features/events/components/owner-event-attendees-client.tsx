"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import {
  getEvent,
  getOwnerAttendees,
  type OwnerAttendeeSummary,
} from "@/features/events/client/api"
import { eventQueryKeys } from "@/features/events/client/query-keys"
import { formatDate } from "@/lib/utils/date-utils"
import { UserGroup02Icon, Camera01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

function OwnerEventAttendeesSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b pb-8">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="size-4" />
                <div className="flex min-w-0 flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AttendeeRow({ attendee }: { attendee: OwnerAttendeeSummary }) {
  const displayName = attendee.nickname.trim() === "" ? "Anonymous" : attendee.nickname

  return (
    <Card className="px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <HugeiconsIcon icon={UserGroup02Icon} className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              Joined {formatDate(attendee.joinedAt, "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={Camera01Icon} className="size-4" />
          <span className="tabular-nums">{attendee.shotsTaken}</span>
        </div>
      </div>
    </Card>
  )
}

export function OwnerEventAttendeesClient({ eventId }: { eventId: number }) {
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: eventQueryKeys.detail(eventId),
    queryFn: () => getEvent(eventId),
    staleTime: 2 * 60_000,
  })
  const { data: attendees, isLoading: isAttendeesLoading } = useQuery({
    queryKey: eventQueryKeys.attendees(eventId),
    queryFn: () => getOwnerAttendees(eventId),
    staleTime: 30_000,
    enabled: !!event,
  })

  if (isEventLoading || !event) {
    return <OwnerEventAttendeesSkeleton />
  }

  return (
    <div className="flex flex-col gap-8">
      <EventPageHeader
        eventStart={event.eventStart}
        eventEnd={event.eventEnd}
        eventName={event.eventName}
      />

      <section className="flex flex-col gap-3">
        {isAttendeesLoading || !attendees ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="size-4" />
                    <div className="flex min-w-0 flex-col gap-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : attendees.length === 0 ? (
          <Card className="px-4 py-8 text-center text-sm text-muted-foreground">
            No attendees yet.
          </Card>
        ) : (
          attendees.map((attendee) => (
            <AttendeeRow
              key={`${attendee.nickname}-${attendee.joinedAt}`}
              attendee={attendee}
            />
          ))
        )}
      </section>
    </div>
  )
}
