import JSZip from "jszip"
import { NextResponse } from "next/server"
import { NotFoundError, ValidationError } from "@/features/events/server/errors"
import { parseEventId } from "@/features/events/server/params"
import { eventsRepository } from "@/features/events/server/repository"
import { eventsService } from "@/features/events/server/service"
import { eventsStorageProvider } from "@/features/events/server/storage-provider"

function getFileName(storagePath: string, index: number) {
  const fileName = storagePath.split("/").pop()
  return fileName || `photo-${String(index + 1).padStart(3, "0")}.jpg`
}

export async function GET(_: Request, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await ctx.params
    const eventIdNum = parseEventId(eventId)
    const event = await eventsService.getPublicEventById(eventIdNum)

    if (new Date() < event.revealAt) {
      return NextResponse.json({ error: "Gallery is not revealed yet" }, { status: 403 })
    }

    const photos = await eventsRepository.findPublicPhotosByEventId(eventIdNum)

    const zip = new JSZip()

    await Promise.all(
      photos.map(async (photo, index) => {
        const bytes = await eventsStorageProvider.downloadPublicPhoto(photo.storagePath)
        zip.file(getFileName(photo.storagePath, index), bytes)
      })
    )

    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })

    return new NextResponse(new Uint8Array(archive), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="event-${eventIdNum}-photos.zip"`,
      },
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
