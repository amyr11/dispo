import Link from "next/link"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { OwnerEventAttendeesClient } from "@/features/events/components/owner-event-attendees-client"

export default async function OwnerEventAttendeesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const eventIdNum = Number(eventId)

  return (
    <div className="flex min-h-svh flex-col items-center bg-muted">
      <Navbar />
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Link href={`/dashboard/${eventIdNum}`}>
            <Button variant="outline" size="icon">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">Dashboard / Attendees</p>
        </div>
        <OwnerEventAttendeesClient eventId={eventIdNum} />
      </div>
    </div>
  )
}
