"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type OwnerGalleryPhoto = {
  id: string
  url: string
}

type OwnerEventGalleryClientProps = {
  eventId: number
  photos: OwnerGalleryPhoto[]
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement("textarea")
  textArea.value = text
  textArea.style.position = "fixed"
  textArea.style.left = "-9999px"
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  document.execCommand("copy")
  document.body.removeChild(textArea)
}

export function OwnerEventGalleryClient({
  eventId,
  photos: initialPhotos,
}: OwnerEventGalleryClientProps) {
  const router = useRouter()
  const [photos, setPhotos] = useState(initialPhotos)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Record<string, boolean>>({})

  const selected = useMemo(() => photos[selectedIndex] ?? null, [photos, selectedIndex])
  const isSelectedPhotoLoaded = selected ? loadedPhotoIds[selected.id] === true : false

  function handlePrev() {
    setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  function handleNext() {
    setSelectedIndex((prev) => (prev + 1) % photos.length)
  }

  async function handleDeleteSelected() {
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
          setSelectedIndex(0)
          return next
        }

        setSelectedIndex((current) => Math.min(current, next.length - 1))
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

  if (photos.length === 0) {
    return (
      <section className="flex flex-col gap-4 py-8">
        <Card className="items-center px-6 py-10 text-center">
          <p className="text-lg">No photos yet</p>
          <p className="text-sm text-muted-foreground">
            Photos will appear here once guests start taking shots.
          </p>
        </Card>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6 py-8">
      <div className="relative overflow-hidden rounded-lg border bg-card">
        {selected && !isSelectedPhotoLoaded ? (
          <Skeleton className="absolute inset-0 h-[300px] w-full sm:h-[420px]" />
        ) : null}
        {selected ? (
          <img
            src={selected.url}
            alt={`Event photo ${selectedIndex + 1}`}
            className="h-[300px] w-full object-contain bg-black/5 sm:h-[420px]"
            onLoad={() => {
              setLoadedPhotoIds((prev) => ({ ...prev, [selected.id]: true }))
            }}
          />
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1/2 left-3 -translate-y-1/2"
          onClick={handlePrev}
          aria-label="Previous photo"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1/2 right-3 -translate-y-1/2"
          onClick={handleNext}
          aria-label="Next photo"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo, index) => (
          <button
            type="button"
            key={photo.id}
            className={`shrink-0 overflow-hidden rounded-md border ${
              selectedIndex === index ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedIndex(index)}
            aria-label={`Select photo ${index + 1}`}
          >
            <img
              src={photo.url}
              alt={`Thumbnail ${index + 1}`}
              className="h-16 w-16 object-cover sm:h-20 sm:w-20"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={handleDownloadAll}
          disabled={isDownloading}
        >
          <HugeiconsIcon icon={Download01Icon} size={16} />
          {isDownloading ? "Preparing ZIP..." : "Download all"}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCopyLink}>
          <HugeiconsIcon icon={Copy01Icon} size={16} />
          {copyStatus === "copied" ? "Copied" : "Copy public gallery link"}
        </Button>
        <Button type="button" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
          <HugeiconsIcon icon={Delete02Icon} size={16} />
          {isDeleting ? "Deleting..." : "Delete selected photo"}
        </Button>
      </div>
    </section>
  )
}
