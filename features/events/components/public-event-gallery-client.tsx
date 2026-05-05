"use client"

import { useState } from "react"
import { ArrowDown01Icon, Copy01Icon, Download01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { copyText, EventGalleryShared, type EventGalleryPhoto } from "./event-gallery-shared"

type PublicEventGalleryClientProps = {
  eventId: number
  photos: (EventGalleryPhoto & { storagePath: string })[]
}

export function PublicEventGalleryClient({
  eventId,
  photos,
}: PublicEventGalleryClientProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const [isDownloading, setIsDownloading] = useState(false)

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

  return (
    <EventGalleryShared
      photos={photos}
      cta={
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          <p className="font-heading text-3xl">Cherish these memories!</p>
          <div className="flex w-full justify-center sm:w-auto">
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
                  {copyStatus === "copied" ? "Copied" : "Copy link"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    />
  )
}
