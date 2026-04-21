import { cn } from "@/lib/utils"

export default function Clickable({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        "w-full cursor-pointer transition-all hover:scale-102 active:scale-98",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      aria-disabled={disabled}
    >
      {children}
    </div>
  )
}
