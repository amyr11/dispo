import { Skeleton } from "@/components/ui/skeleton"

export default function PublicEventCameraLoading() {
  return (
    <div className="flex min-h-svh justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-4xl border border-border/60 bg-[#f8d547] p-4 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-black/10 bg-black/10 px-4 py-3">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-24 bg-black/20" />
              <Skeleton className="h-5 w-40 bg-black/20" />
            </div>
            <Skeleton className="h-6 w-20 bg-black/20" />
          </div>

          <div className="flex justify-center">
            <Skeleton className="h-44 w-60 rounded-md border-4 border-black/20 bg-black/20" />
          </div>

          <div className="mt-3">
            <Skeleton className="mb-1 h-3 w-14 bg-black/20" />
            <Skeleton className="h-10 w-full bg-black/20" />
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <Skeleton className="size-16 rounded-full bg-white/80" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-10 w-24 bg-black/20" />
              <Skeleton className="h-4 w-32 bg-black/20" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <Skeleton className="h-10 w-32" />
        </div>

        <Skeleton className="mx-auto mt-3 h-4 w-44" />
      </div>
    </div>
  )
}
