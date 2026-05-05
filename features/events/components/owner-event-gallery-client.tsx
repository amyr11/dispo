"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogDesctructiveAction,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  copyText,
  EventGalleryShared,
  type EventGalleryPhoto,
} from "./event-gallery-shared"

type OwnerEventGalleryClientProps = {
  eventId: number
  photos: EventGalleryPhoto[]
}

export function OwnerEventGalleryClient({
  eventId,
  photos: initialPhotos,
}: OwnerEventGalleryClientProps) {
  const router = useRouter()
  const [photos, setPhotos] = useState(initialPhotos)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(
    initialPhotos[0]?.id ?? null
  )
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    new Set()
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")

  const deleteTargetIds = Array.from(selectedPhotoIds)

  async function handleDeleteSelected() {
    if (deleteTargetIds.length === 0 || isDeleting) return

    setIsDeleting(true)

    try {
      const deleteResults = await Promise.allSettled(
        deleteTargetIds.map(async (photoId) => {
          const response = await fetch(
            `/api/events/${eventId}/photos/${photoId}`,
            {
              method: "DELETE",
              credentials: "include",
            }
          )

          if (!response.ok) {
            const body = await response
              .json()
              .catch(() => ({ error: "Unable to delete photo" }))
            throw new Error(body.error ?? "Unable to delete photo")
          }
        })
      )

      const failedCount = deleteResults.filter(
        (result) => result.status === "rejected"
      ).length

      setPhotos((prev) => {
        const idsToRemove = new Set(
          deleteResults
            .map((result, index) =>
              result.status === "fulfilled" ? deleteTargetIds[index] : null
            )
            .filter((id): id is string => id !== null)
        )
        const next = prev.filter((photo) => !idsToRemove.has(photo.id))

        if (next.length === 0) {
          setSelectedPhotoId(null)
          return next
        }

        if (
          selectedPhotoId &&
          !next.some((photo) => photo.id === selectedPhotoId)
        ) {
          setSelectedPhotoId(next[0]?.id ?? null)
        }

        return next
      })

      setSelectedPhotoIds(new Set())
      setIsSelectMode(false)
      setIsDeleteDialogOpen(false)

      if (failedCount > 0) {
        window.alert(
          failedCount === deleteTargetIds.length
            ? "Unable to delete selected photos"
            : `${failedCount} selected photo(s) could not be deleted`
        )
      }

      router.refresh()
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to delete photo"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  function togglePhotoSelection(photo: EventGalleryPhoto) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev)
      if (next.has(photo.id)) {
        next.delete(photo.id)
      } else {
        next.add(photo.id)
      }
      return next
    })
  }

  async function handleCopyLink() {
    const publicGalleryUrl = `${window.location.origin}/events/${eventId}/gallery`
    await copyText(publicGalleryUrl)
    setCopyStatus("copied")
    window.setTimeout(() => setCopyStatus("idle"), 2000)
  }

  async function handleDownloadAll() {
    setIsDownloading(true)

    try {
      const response = await fetch(`/events/${eventId}/gallery/download`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Unable to download photos")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `event-${eventId}-photos.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <EventGalleryShared
        photos={photos}
        onSelectedPhotoChange={(photo) => setSelectedPhotoId(photo?.id ?? null)}
        isSelectionMode={isSelectMode}
        selectedPhotoIds={selectedPhotoIds}
        onTogglePhotoSelection={togglePhotoSelection}
        cta={
          <div className="flex flex-col items-center gap-2 pt-1">
            {isSelectMode ? (
              <p className="text-center text-sm text-muted-foreground">
                {selectedPhotoIds.size} photo
                {selectedPhotoIds.size === 1 ? "" : "s"} selected
              </p>
            ) : null}
            <div className="flex flex-row flex-wrap items-center justify-center gap-3">
              {isSelectMode ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedPhotoIds(new Set())
                    setIsSelectMode(false)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="default">
                      Share
                      <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        void handleDownloadAll()
                      }}
                      disabled={isDownloading}
                    >
                      <HugeiconsIcon icon={Download01Icon} size={16} />
                      {isDownloading ? "Preparing ZIP..." : "Download all"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        void handleCopyLink()
                      }}
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={16} />
                      {copyStatus === "copied"
                        ? "Copied"
                        : "Copy public gallery link"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (!isSelectMode) {
                    setSelectedPhotoIds(new Set())
                    setIsSelectMode(true)
                    return
                  }

                  if (deleteTargetIds.length === 0) {
                    window.alert("Select at least one photo to delete")
                    return
                  }

                  setIsDeleteDialogOpen(true)
                }}
                disabled={
                  isDeleting || (isSelectMode && deleteTargetIds.length === 0)
                }
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
                {isDeleting
                  ? "Deleting..."
                  : isSelectMode
                    ? `Delete photos (${deleteTargetIds.length})`
                    : "Delete photos"}
              </Button>
            </div>
          </div>
        }
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Delete ${deleteTargetIds.length} selected photo${
                deleteTargetIds.length === 1 ? "" : "s"
              }?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected photo
              {deleteTargetIds.length === 1 ? "" : "s"} will be permanently
              removed from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogDesctructiveAction
              onClick={() => {
                void handleDeleteSelected()
              }}
              disabled={isDeleting || deleteTargetIds.length === 0}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogDesctructiveAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
