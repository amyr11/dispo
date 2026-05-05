"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type EventGalleryPhoto = {
  id: string
  url: string
}

type EventGallerySharedProps = {
  photos: EventGalleryPhoto[]
  cta?: ReactNode
  onSelectedPhotoChange?: (photo: EventGalleryPhoto | null) => void
  isSelectionMode?: boolean
  selectedPhotoIds?: Set<string>
  onTogglePhotoSelection?: (photo: EventGalleryPhoto) => void
}

export function EventGalleryShared({
  photos,
  cta,
  onSelectedPhotoChange,
  isSelectionMode = false,
  selectedPhotoIds,
  onTogglePhotoSelection,
}: EventGallerySharedProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Record<string, boolean>>({})

  const selected = useMemo(() => photos[selectedIndex] ?? null, [photos, selectedIndex])
  const isSelectedPhotoLoaded = selected ? loadedPhotoIds[selected.id] === true : false

  useEffect(() => {
    onSelectedPhotoChange?.(selected)
  }, [onSelectedPhotoChange, selected])

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
    <section className="flex flex-col gap-6 pt-4 pb-8">
      <div className="relative min-h-[300px] overflow-hidden rounded-lg border bg-card sm:min-h-[420px]">
        {selected && !isSelectedPhotoLoaded ? (
          <Skeleton className="absolute inset-0 h-[300px] w-full sm:h-[420px]" />
        ) : null}
        {selected ? (
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

      <div className="flex gap-2.5 overflow-x-auto pb-2">
        {photos.map((photo, index) => (
          <button
            type="button"
            key={photo.id}
            className={`relative shrink-0 overflow-hidden rounded-md border ${
              selectedIndex === index ? "ring-2 ring-primary" : ""
            } ${
              isSelectionMode && selectedPhotoIds?.has(photo.id)
                ? "ring-2 ring-destructive"
                : ""
            }`}
            onClick={() => {
              setSelectedIndex(index)
              if (isSelectionMode) {
                onTogglePhotoSelection?.(photo)
              }
            }}
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
            {isSelectionMode && selectedPhotoIds?.has(photo.id) ? (
              <span className="absolute top-1 right-1 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                Selected
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {cta}
    </section>
  )
}

export async function copyText(text: string) {
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
