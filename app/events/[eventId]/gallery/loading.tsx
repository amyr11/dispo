import { Skeleton } from "@/components/ui/skeleton"

export default function PublicGalleryLoading() {
  return (
    <div className="flex min-h-svh justify-center bg-muted">
      <div className="my-20 flex w-full max-w-lg flex-col px-4 sm:max-w-2xl">
        <div className="space-y-2 border-b pb-8">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="grid grid-cols-2 gap-3 py-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
      </div>
    </div>
  )
}
