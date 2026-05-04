import { Navbar } from "@/components/ui/navbar"
import { EventDashboardClient } from "@/features/events/components/event-dashboard-client"

export default async function Dashboard({
  params,
}: {
  params: { eventId: string }
}) {
  const { eventId } = await params
  const eventIdNum = Number(eventId)

  return (
    <div className="flex flex-col items-center justify-center">
      <Navbar />
      <EventDashboardClient eventId={eventIdNum} />
    </div>
  )
}
