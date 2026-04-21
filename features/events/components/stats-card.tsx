import { Card } from "@/components/ui/card"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react"

interface StatsCardProps {
  icon: IconSvgElement
  label: string
  value: number
  limit?: number | string
}

export default function StatsCard({
  icon,
  label,
  value,
  limit,
}: StatsCardProps) {
  return (
    <Card className="w-full px-4">
      <div className="flex h-10 items-center gap-4">
        <HugeiconsIcon icon={icon} className="min-w-5 text-muted-foreground" />
        <p className="w-full font-heading text-lg font-medium">{label}</p>
        <div>
          <p className="text-2xl font-medium">
            {value}
            {limit !== undefined && (
              <>
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  /
                </span>
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {limit}
                </span>
              </>
            )}
          </p>
        </div>
        <HugeiconsIcon icon={ArrowRight01Icon} className="min-w-4" />
      </div>
    </Card>
  )
}
