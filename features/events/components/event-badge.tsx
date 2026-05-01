import { Badge } from "@/components/ui/badge"
import {
  type EventStatus,
  getEventStatus,
} from "@/features/events/utils/event-status"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const statusConfig: Record<
  EventStatus,
  { label: string; variant: BadgeVariant; dotClass?: string }
> = {
  Upcoming: {
    label: "Upcoming",
    variant: "outline",
    dotClass: "bg-muted-foreground/50",
  },
  Ongoing: {
    label: "Ongoing",
    variant: "default",
    dotClass: "bg-primary-foreground animate-pulse",
  },
  Ended: {
    label: "Ended",
    variant: "secondary",
  },
}

interface EventBadgeProps {
  eventStart: Date | string
}

export default function EventBadge({ eventStart }: EventBadgeProps) {
  const status = getEventStatus(eventStart)
  const { label, variant, dotClass } = statusConfig[status]

  return (
    <Badge variant={variant} className="flex items-center gap-1.5">
      {dotClass && <span className={`size-1.5 rounded-full ${dotClass}`} />}
      {label}
    </Badge>
  )
}
