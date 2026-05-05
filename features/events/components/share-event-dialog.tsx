"use client"

import { useMemo, useRef, useState } from "react"
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react"
import {
  Copy01Icon,
  Download02Icon,
  Clock01Icon,
  QrCode01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatEventDateTimeRange } from "@/lib/utils/date-utils"

type ShareEventDialogProps = {
  eventId: number
  eventName: string
  eventStart: string
  eventEnd: string
}

const QR_CODE_DOWNLOAD_SIZE = 1024
const QR_CODE_DISPLAY_SIZE = 208

function getDownloadName(eventName: string): string {
  const slug = eventName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return `${slug || "event"}-qr.png`
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

export function ShareEventDialog({
  eventId,
  eventName,
  eventStart,
  eventEnd,
}: ShareEventDialogProps) {
  const qrRef = useRef<HTMLCanvasElement | null>(null)
  const [open, setOpen] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const shareMessage = useMemo(() => {
    if (!publicUrl) return ""
    return `Join ${eventName} on Candid and make long-lasting memories!✨📸\n\n${publicUrl}\n${publicUrl}\n${publicUrl}`
  }, [eventName, publicUrl])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      setPublicUrl(`${window.location.origin}/events/${eventId}/public`)
    }
  }

  function handleDownload() {
    const canvas = qrRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = getDownloadName(eventName)
    link.click()
  }

  async function handleCopy() {
    if (!shareMessage) return

    await copyText(shareMessage)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <HugeiconsIcon icon={QrCode01Icon} size={16} />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs gap-5 p-6 text-center sm:max-w-[360px]">
        <DialogHeader className="items-center gap-1 px-5 text-center">
          <DialogTitle className="max-w-full font-heading text-xl leading-tight font-semibold break-words">
            {eventName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
            <span>{formatEventDateTimeRange(eventStart, eventEnd)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto flex size-56 items-center justify-center rounded-lg border bg-background p-3">
          {publicUrl ? (
            <>
              <QRCodeSVG
                value={publicUrl}
                size={QR_CODE_DISPLAY_SIZE}
                level="H"
                marginSize={4}
                title={`${eventName} public event link`}
                className="size-full rounded-sm bg-white"
              />
              <QRCodeCanvas
                ref={qrRef}
                value={publicUrl}
                size={QR_CODE_DOWNLOAD_SIZE}
                level="H"
                marginSize={4}
                title={`${eventName} public event link`}
                className="hidden"
              />
            </>
          ) : (
            <div className="size-full rounded-sm bg-muted" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={handleDownload}
            disabled={!publicUrl}
          >
            <HugeiconsIcon icon={Download02Icon} size={16} />
            Download printable QR
          </Button>
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={handleCopy}
            disabled={!publicUrl}
          >
            <HugeiconsIcon icon={Copy01Icon} size={16} />
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
