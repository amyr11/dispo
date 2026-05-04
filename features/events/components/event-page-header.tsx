import EventBadge from "@/features/events/components/event-badge"
import { formatDate } from "@/lib/utils/date-utils"

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
        <p className="text-sm">{formatDate(eventStart)}</p>
      </div>
    </header>
  )
}
