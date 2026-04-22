import { Navbar } from "@/components/ui/navbar"
import {
  getAttendeesCount,
  getEvent,
  getShotsCount,
} from "@/features/events/services/event-services"
import { ReactQueryProvider } from "@/lib/providers/react-query-provider"
import { EventDashboardClient } from "@/features/events/components/event-dashboard-client"

export default async function Dashboard({
  params,
}: {
  params: { eventId: string }
}) {
  const { eventId } = await params
  const eventIdNum = Number(eventId)
  const event = await getEvent(eventIdNum)
  const [attendeesCount, shotsCount] = await Promise.all([
    getAttendeesCount(event.id),
    getShotsCount(event.id),
  ])

  return (
    <ReactQueryProvider>
      <div className="flex flex-col items-center justify-center">
        <Navbar />
        <EventDashboardClient
          eventId={eventIdNum}
          initialEvent={event}
          initialAttendeesCount={attendeesCount}
          initialShotsCount={shotsCount}
        />
      </div>
    </ReactQueryProvider>
  )
}
