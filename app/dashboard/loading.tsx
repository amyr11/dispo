import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto my-2 flex h-14 w-full max-w-lg items-center justify-between px-4 sm:max-w-2xl">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      <div className="my-20 flex w-full max-w-lg flex-col gap-4 px-4 sm:max-w-2xl">
        <div className="my-8 flex flex-col items-center gap-2 py-12">
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-52" />
        </div>

        <Skeleton className="h-10 w-full" />

        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
}
