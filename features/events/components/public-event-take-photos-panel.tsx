"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Camera01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { attendeeFingerprintKey, getStoredPublicAttendeeValue } from "@/features/events/utils/public-attendee-storage"
import { formatDate } from "@/lib/utils/date-utils"

type PublicEventTakePhotosPanelProps = {
  eventId: number
  photoLimit: number
  revealAt: string
  limitReachedNotice?: boolean
}

type CaptureStateResponse = {
  photosTaken: number
  photoLimit: number
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) {
    return fallbackMessage
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null
  return body?.error ?? fallbackMessage
}

async function readJsonBody<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage)
  }

  return (await response.json()) as T
}

export function PublicEventTakePhotosPanel({
  eventId,
  photoLimit,
  revealAt,
  limitReachedNotice = false,
}: PublicEventTakePhotosPanelProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [photosTaken, setPhotosTaken] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadCaptureState() {
      const fingerprint = getStoredPublicAttendeeValue(
        attendeeFingerprintKey(eventId)
      )

      if (!fingerprint) {
        if (isMounted) {
          setIsLoading(false)
          setError("Attendee session not found. Rejoin the event to take photos.")
        }
        return
      }

      try {
        const response = await fetch(
          `/events/${eventId}/public/capture?fingerprint=${encodeURIComponent(fingerprint)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        )

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Unable to load attendee state")
          )
        }

        const body = await readJsonBody<CaptureStateResponse>(
          response,
          "Unable to load attendee state"
        )

        if (!isMounted) return
        setPhotosTaken(body.photosTaken)
      } catch (loadError) {
        if (!isMounted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load attendee state"
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCaptureState()

    return () => {
      isMounted = false
    }
  }, [eventId])

  const hasReachedLimit = useMemo(
    () => photosTaken >= photoLimit,
    [photoLimit, photosTaken]
  )
  const showLimitNotice = hasReachedLimit || limitReachedNotice

  return (
    <section className="flex flex-col items-center gap-4 pt-6 text-center">
      <p className="text-xl">Start making memories!</p>
      {isLoading ? (
        <>
          <Skeleton className="h-10 w-40" />
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </>
      ) : hasReachedLimit || !!error ? (
        <Button type="button" className="w-40" disabled>
          <HugeiconsIcon icon={Camera01Icon} size={16} />
          Take photos
        </Button>
      ) : (
        <Button type="button" className="w-40" asChild>
          <Link href={`/events/${eventId}/public/camera`}>
            <HugeiconsIcon icon={Camera01Icon} size={16} />
            Take photos
          </Link>
        </Button>
      )}
      {!isLoading ? (
        <div className="flex flex-col items-center gap-1">
          <p className="font-heading text-5xl leading-none font-semibold">
            {photosTaken}
            <span className="ml-1 text-base font-normal">/ {photoLimit}</span>
          </p>
          <p className="text-sm">Shots taken</p>
        </div>
      ) : null}
      {error && <p className="max-w-xs text-sm text-destructive">{error}</p>}
      {showLimitNotice && (
        <p className="max-w-sm text-sm text-muted-foreground">
          You&apos;ve reached your photo limit. All event photos will be
          revealed on {formatDate(revealAt)}.
        </p>
      )}
    </section>
  )
}
