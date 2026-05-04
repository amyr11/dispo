"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

type CountdownPanelProps = {
  targetAt: number
  initialNow?: number
  title: string
  description: string
  onComplete?: () => void
  className?: string
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

export function CountdownPanel({
  targetAt,
  initialNow,
  title,
  description,
  onComplete,
  className,
}: CountdownPanelProps) {
  const [now, setNow] = useState(initialNow ?? Date.now())
  const countdownParts = useMemo(
    () => getCountdownParts(targetAt - now),
    [targetAt, now]
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), SECOND)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!onComplete) return
    if (now >= targetAt) {
      onComplete()
    }
  }, [now, onComplete, targetAt])

  return (
    <section className={className ?? "flex w-full max-w-md flex-col gap-5"}>
      <div className="flex flex-col gap-2">
        <HugeiconsIcon icon={Clock01Icon} className="size-8 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
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
            <span className="text-xs text-muted-foreground">{part.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
