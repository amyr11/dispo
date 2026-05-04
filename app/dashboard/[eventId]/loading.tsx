import { Skeleton } from "@/components/ui/skeleton"

export default function EventDashboardLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-muted">
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto my-2 flex h-14 w-full max-w-lg items-center justify-between px-4 sm:max-w-2xl">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="size-7" />
        </div>

        <div className="space-y-2 border-b pb-8">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="grid grid-cols-2 gap-3 py-8">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>

        <Skeleton className="h-10 w-44" />
      </div>
    </div>
  )
}
