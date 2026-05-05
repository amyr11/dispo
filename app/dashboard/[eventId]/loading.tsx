import { Navbar } from "@/components/ui/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function EventDashboardLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-muted">
      <Navbar />
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <div className="flex items-center">
          <Skeleton className="size-10" />
        </div>
        <div className="pt-8">
          <div className="flex flex-col gap-2 border-b pb-8">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>
    </div>
  )
}
