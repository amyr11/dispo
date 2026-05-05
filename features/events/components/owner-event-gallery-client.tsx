"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown01Icon, Copy01Icon, Delete02Icon, Download01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { copyText, EventGalleryShared, type EventGalleryPhoto } from "./event-gallery-shared"

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")

  async function handleDeleteSelected() {
    const selected = selectedPhotoId
      ? photos.find((photo) => photo.id === selectedPhotoId) ?? null
      : null
    if (!selected || isDeleting) return

    const confirmed = window.confirm("Delete this photo from the gallery?")
    if (!confirmed) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/events/${eventId}/photos/${selected.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Unable to delete photo" }))
        throw new Error(body.error ?? "Unable to delete photo")
      }

      setPhotos((prev) => {
        const next = prev.filter((photo) => photo.id !== selected.id)

        if (next.length === 0) {
          setSelectedPhotoId(null)
          return next
        }

        return next
      })

      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete photo")
    } finally {
      setIsDeleting(false)
    }
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
    <EventGalleryShared
      photos={photos}
      onSelectedPhotoChange={(photo) => setSelectedPhotoId(photo?.id ?? null)}
      cta={
        <div className="flex flex-row flex-nowrap items-center justify-center gap-3 pt-1">
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
                {copyStatus === "copied" ? "Copied" : "Copy public gallery link"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
            <HugeiconsIcon icon={Delete02Icon} size={16} />
            {isDeleting ? "Deleting..." : "Delete selected photo"}
          </Button>
        </div>
      }
    />
  )
}
