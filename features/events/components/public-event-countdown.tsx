"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import EventBadge from "@/features/events/components/event-badge"
import { formatDate } from "@/lib/utils/date-utils"

type PublicEventCountdownProps = {
  eventName: string
  eventStart: string
  initialNow: number
  targetAt: number
}

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

function getCountdownParts(timeLeft: number) {
  const safeTimeLeft = Math.max(0, timeLeft)
  const days = Math.floor(safeTimeLeft / DAY)
  const hours = Math.floor((safeTimeLeft % DAY) / HOUR)
  const minutes = Math.floor((safeTimeLeft % HOUR) / MINUTE)
  const seconds = Math.floor((safeTimeLeft % MINUTE) / SECOND)

  return [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Mins", value: minutes },
    { label: "Secs", value: seconds },
  ]
}

export function PublicEventCountdown({
  eventName,
  eventStart,
  initialNow,
  targetAt,
}: PublicEventCountdownProps) {
  const router = useRouter()
  const [now, setNow] = useState(initialNow)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), SECOND)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (now >= targetAt) {
      router.refresh()
    }
  }, [now, router, targetAt])

  const countdownParts = useMemo(
    () => getCountdownParts(targetAt - now),
    [now, targetAt]
  )

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-2 border-b pb-8">
        <EventBadge eventStart={eventStart} />
        <p className="font-heading text-2xl font-semibold">{eventName}</p>
        <p className="text-sm">{formatDate(eventStart)}</p>
      </header>

      <section className="flex w-full max-w-md flex-col gap-5">
        <div className="flex flex-col gap-2">
          <HugeiconsIcon
            icon={Clock01Icon}
            className="size-8 text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-medium">
              Hold on to your cameras... 📸 💤
            </h1>
            <p className="text-sm text-muted-foreground">
              You can join when the event is live.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2" aria-live="polite">
          {countdownParts.map((part) => (
            <div
              key={part.label}
              className="flex min-w-0 flex-col items-center gap-1 rounded-md border bg-background px-2 py-4 text-center"
            >
              <span className="w-full truncate font-heading text-2xl leading-none font-semibold tabular-nums">
                {part.value}
              </span>
              <span className="text-xs text-muted-foreground">
                {part.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
