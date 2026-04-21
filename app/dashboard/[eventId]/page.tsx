import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import EventBadge from "@/features/events/components/event-badge"
import { getEvent } from "@/features/events/services/events-util"
import { ReactQueryProvider } from "@/lib/providers/react-query-provider"
import { formatDate } from "@/lib/utils/date-utils"
import {
  ArrowLeft01Icon,
  PencilEdit01Icon,
  Delete02Icon,
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

  return (
    <ReactQueryProvider>
      <div className="flex flex-col items-center justify-center">
        <div className="sticky top-0 z-50 w-full max-w-lg bg-muted">
          <Navbar />
        </div>
        <div className="mt-28 flex w-full max-w-lg flex-col gap-8 px-4">
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
            </div>
          </div>
          <div>
            <div className="flex w-full flex-col gap-2">
              {/* Event info */}
              <EventBadge eventStart={event?.eventStart} />
              <p className="font-heading text-2xl">{event?.eventName}</p>
              <p className="text-sm">{formatDate(event?.eventStart)}</p>
            </div>
          </div>
        </div>
      </div>
    </ReactQueryProvider>
  )
}
