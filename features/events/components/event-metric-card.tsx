import { Card } from "@/components/ui/card"
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react"

type EventMetricCardProps = {
  icon: IconSvgElement
  label: string
  value: number
  caption?: string
}

export function EventMetricCard({
  icon,
  label,
  value,
  caption,
}: EventMetricCardProps) {
  return (
    <Card className="items-center gap-2 px-4 py-5 text-center">
      <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
      <p className="font-heading text-4xl leading-none font-semibold">{value}</p>
      {caption ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      ) : (
        <p className="text-sm">{label}</p>
      )}
    </Card>
  )
}
