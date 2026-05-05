import EventBadge from "@/features/events/components/event-badge"
import { formatEventDateTimeRange } from "@/lib/utils/date-utils"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

type EventPageHeaderProps = {
  eventStart: string
  eventEnd: string
  eventName: string
  titleTag?: "h1" | "p"
}

export function EventPageHeader({
  eventStart,
  eventEnd,
  eventName,
  titleTag = "p",
}: EventPageHeaderProps) {
  const TitleTag = titleTag

  return (
    <header className="flex flex-col gap-2 border-b pb-8">
      <EventBadge eventStart={eventStart} eventEnd={eventEnd} />
      <div className="flex flex-col gap-1">
        <TitleTag className="font-heading text-2xl font-semibold">
          {eventName}
        </TitleTag>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
          <span>{formatEventDateTimeRange(eventStart, eventEnd)}</span>
        </p>
      </div>
    </header>
  )
}
