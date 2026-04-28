import { Navbar } from "@/components/ui/navbar"
import { ReactQueryProvider } from "@/lib/providers/react-query-provider"
import { EventDashboardClient } from "@/features/events/components/event-dashboard-client"

export default async function Dashboard({
  params,
}: {
  params: { eventId: string }
}) {
  const { eventId } = await params
  const eventIdNum = Number(eventId)

  return (
    <ReactQueryProvider>
      <div className="flex flex-col items-center justify-center">
        <Navbar />
        <EventDashboardClient eventId={eventIdNum} />
      </div>
    </ReactQueryProvider>
  )
}
