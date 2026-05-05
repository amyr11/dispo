import { PublicNavbar } from "@/components/ui/public-navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function PublicEventLoading() {
  return (
    <div className="min-h-svh bg-muted">
      <PublicNavbar />
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pt-24 pb-12 sm:max-w-2xl">
        <div className="flex flex-col gap-2 border-b pb-8">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-44" />
        </div>

        <section className="grid grid-cols-2 gap-3 py-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </section>

        <Skeleton className="h-24 w-full rounded-md" />
      </div>
    </div>
  )
}
