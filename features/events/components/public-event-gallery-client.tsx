"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type GalleryPhoto = {
  id: string
  url: string
  storagePath: string
}

type PublicEventGalleryClientProps = {
  eventId: number
  photos: GalleryPhoto[]
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

export function PublicEventGalleryClient({
  eventId,
  photos,
}: PublicEventGalleryClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const [isDownloading, setIsDownloading] = useState(false)
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Record<string, boolean>>({})

  const selected = photos[selectedIndex] ?? null
  const isSelectedPhotoLoaded = selected ? loadedPhotoIds[selected.id] === true : false

  async function handleCopyLink() {
    const galleryUrl = `${window.location.origin}/events/${eventId}/gallery`
    await copyText(galleryUrl)
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

  function handlePrev() {
    setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  function handleNext() {
    setSelectedIndex((prev) => (prev + 1) % photos.length)
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
      <div className="relative min-h-[300px] overflow-hidden rounded-lg border bg-card sm:min-h-[420px]">
        {selected && !isSelectedPhotoLoaded ? (
          <Skeleton className="absolute inset-0 h-[300px] w-full sm:h-[420px]" />
        ) : null}
        {selected && (
          <Image
            src={selected.url}
            alt={`Event photo ${selectedIndex + 1}`}
            fill
            sizes="100vw"
            className="object-contain bg-black/5"
            unoptimized
            onLoad={() => {
              setLoadedPhotoIds((prev) => ({ ...prev, [selected.id]: true }))
            }}
          />
        )}
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
            <Image
              src={photo.url}
              alt={`Thumbnail ${index + 1}`}
              width={80}
              height={80}
              sizes="80px"
              className="h-16 w-16 object-cover sm:h-20 sm:w-20"
              unoptimized
            />
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <p className="font-heading text-3xl">Cherish these memories!</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
            {copyStatus === "copied" ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </section>
  )
}
