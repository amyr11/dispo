import { Navbar } from "@/components/ui/navbar"
import { getProfile } from "@/features/auth/services/auth-utils"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Event } from "@/features/events/types/event-types"
import { getEvents } from "@/features/events/services/events-util"
import { CreateEventDialog } from "@/features/events/components/create-event-dialog"

export default async function Dashboard() {
  const { profile } = await getProfile()

  const eventsList: Event[] = getEvents()

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="sticky top-0 z-50 w-full max-w-lg bg-muted">
        <Navbar />
      </div>
      <div className="w-full max-w-lg px-4">
        {/* Greeting */}
        <div className="mt-14 flex justify-center">
          <div className="my-8 flex flex-col gap-2 py-4 text-center">
            <p className="font-heading text-4xl">
              Hi, <span className="font-bold">{profile?.user_name}</span>
            </p>
            <p>Ready to make some memories?</p>
          </div>
        </div>
        {/* Events */}
        <div>
          <CreateEventDialog />
        </div>
        {/* Events list */}
        <div className="mt-4 flex flex-col gap-3">
          {eventsList.length === 0 ? (
            <p className="mt-4 text-center text-muted-foreground">
              It&apos;s quiet here 💤.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {eventsList.map((event) => (
                <Card
                  key={event.eventName}
                  className="cursor-pointer transition-all active:scale-95"
                >
                  <CardHeader>
                    <CardTitle>{event.eventName}</CardTitle>
                    <CardDescription>{event.eventDate}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
