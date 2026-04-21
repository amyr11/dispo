import { Navbar } from "@/components/ui/navbar"
import { getProfile } from "@/features/auth/services/auth-utils"
import { CreateEventDialog } from "@/features/events/components/create-event-dialog"
import { EventsList } from "@/features/events/components/events-list"

export default async function Dashboard() {
  const { profile } = await getProfile()

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="sticky top-0 z-50 w-full max-w-lg bg-muted">
        <Navbar />
      </div>
      <div className="mt-20 w-full max-w-lg px-4">
        <div className="flex justify-center">
          <div className="my-8 flex flex-col gap-2 py-12 text-center">
            <p className="font-heading text-4xl">
              Hi, <span className="font-bold">{profile?.user_name}</span>
            </p>
            <p>Ready to make some memories?</p>
          </div>
        </div>
        <div>
          <CreateEventDialog />
        </div>
        <EventsList />
      </div>
    </div>
  )
}
