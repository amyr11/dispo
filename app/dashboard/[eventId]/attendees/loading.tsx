import { Navbar } from "@/components/ui/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function OwnerEventAttendeesLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-muted">
      <Navbar />
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="size-10" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  )
}
