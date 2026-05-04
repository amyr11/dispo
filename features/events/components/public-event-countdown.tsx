"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { CountdownPanel } from "@/features/events/components/countdown-panel"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import { formatDate } from "@/lib/utils/date-utils"

type PublicEventCountdownProps = {
  eventName: string
  eventStart: string
  initialNow: number
  targetAt: number
}

export function PublicEventCountdown({
  eventName,
  eventStart,
  initialNow,
  targetAt,
}: PublicEventCountdownProps) {
  const router = useRouter()
  const handleComplete = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="flex w-full flex-col gap-8">
      <EventPageHeader eventStart={eventStart} eventName={eventName} />

      <CountdownPanel
        targetAt={targetAt}
        initialNow={initialNow}
        title="Hold on to your cameras... 📸 💤"
        description={`You can join when the event goes live on ${formatDate(
          eventStart,
          "MMMM d, yyyy h:mm a"
        )}.`}
        onComplete={handleComplete}
      />
    </div>
  )
}
