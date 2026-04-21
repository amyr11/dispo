import { Button } from "@/components/ui/button"
import Clickable from "@/components/ui/clickable"
import { Navbar } from "@/components/ui/navbar"
import EventBadge from "@/features/events/components/event-badge"
import StatsCard from "@/features/events/components/stats-card"
import {
  getAttendeesCount,
  getEvent,
  getShotsCount,
} from "@/features/events/services/events-util"
import { ReactQueryProvider } from "@/lib/providers/react-query-provider"
import { formatDate } from "@/lib/utils/date-utils"
import {
  ArrowLeft01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  UserGroup02Icon,
  Camera01Icon,
  QrCode01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

export default async function Dashboard({
  params,
}: {
  params: { eventId: string }
}) {
  const { eventId } = await params
  const event = await getEvent(eventId)
  const [attendeesCount, shotsCount] = await Promise.all([
    getAttendeesCount(eventId),
    getShotsCount(eventId),
  ])

  return (
    <ReactQueryProvider>
      <div className="flex flex-col items-center justify-center">
        <Navbar />
        <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
          {/* Top row: back button + action buttons */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button variant="destructive" size="icon">
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </Button>
              <Button variant="outline" size="icon">
                <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
              </Button>
              <Button variant="default">
                <HugeiconsIcon icon={QrCode01Icon} size={16} />
                Share
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-b py-8">
            {/* Event info */}
            <EventBadge eventStart={event.eventStart} />
            <p className="font-heading text-2xl">{event.eventName}</p>
            <p className="text-sm">{formatDate(event.eventStart)}</p>
          </div>
          <div className="flex flex-col gap-2 py-8 sm:flex-row">
            <Clickable>
              <StatsCard
                icon={UserGroup02Icon}
                label="Attendees"
                value={attendeesCount}
                limit={event.attendeeLimit}
              />
            </Clickable>
            <Clickable disabled>
              <Link href={"/dashboard"}>
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
      </div>
    </ReactQueryProvider>
  )
}
