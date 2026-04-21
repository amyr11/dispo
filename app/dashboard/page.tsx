import { Navbar } from "@/components/ui/navbar"
import { getProfile } from "@/features/auth/services/auth-utils"
import { CreateEventDialog } from "@/features/events/components/create-event-dialog"
import { EventsList } from "@/features/events/components/events-list"

export default async function Dashboard() {
  const { profile } = await getProfile()

  return (
    <div className="flex flex-col items-center justify-center">
      <Navbar />
      <div className="my-20 flex w-full max-w-lg flex-col gap-4 px-4 sm:max-w-2xl">
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
