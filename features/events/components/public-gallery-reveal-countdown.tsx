"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { CountdownPanel } from "@/features/events/components/countdown-panel"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import { formatDate } from "@/lib/utils/date-utils"

type PublicGalleryRevealCountdownProps = {
  eventName: string
  eventStart: string
  revealAt: string
  initialNow: number
}

export function PublicGalleryRevealCountdown({
  eventName,
  eventStart,
  revealAt,
  initialNow,
}: PublicGalleryRevealCountdownProps) {
  const router = useRouter()
  const revealAtMs = new Date(revealAt).getTime()
  const handleComplete = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="flex w-full flex-col gap-8">
      <EventPageHeader eventStart={eventStart} eventName={eventName} />

      <CountdownPanel
        targetAt={revealAtMs}
        initialNow={initialNow}
        title="Gallery reveal countdown"
        description={`Photos unlock on ${formatDate(
          revealAt,
          "MMMM d, yyyy h:mm a"
        )}.`}
        onComplete={handleComplete}
      />
    </div>
  )
}
