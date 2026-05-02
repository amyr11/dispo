"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera01Icon, FlashOffIcon, FlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { attendeeFingerprintKey, getStoredPublicAttendeeValue } from "@/features/events/utils/public-attendee-storage"

type PublicEventCameraProps = {
  eventId: number
  eventName: string
}

type CaptureStateResponse = {
  photosTaken: number
  photoLimit: number
}

type CapturePhotoResponse = {
  photosTaken: number
  photoLimit: number
  reachedLimit: boolean
}

type CapturePhotoErrorResponse = {
  error?: string
  code?: string
}

type MediaTrackCapabilitiesWithTorch = MediaTrackCapabilities & {
  torch?: boolean
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

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to capture photo"))
          return
        }

        resolve(blob)
      },
      "image/jpeg",
      0.92
    )
  })
}

export function PublicEventCamera({ eventId, eventName }: PublicEventCameraProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState("")
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFlashSupported, setIsFlashSupported] = useState(false)
  const [isFlashForced, setIsFlashForced] = useState(false)
  const [fingerprint] = useState(() => {
    if (typeof window === "undefined") return ""

    return getStoredPublicAttendeeValue(attendeeFingerprintKey(eventId))
  })
  const [photosTaken, setPhotosTaken] = useState(0)
  const [photoLimit, setPhotoLimit] = useState(0)

  const photosLeft = useMemo(
    () => Math.max(0, photoLimit - photosTaken),
    [photoLimit, photosTaken]
  )

  useEffect(() => {
    if (!fingerprint) {
      router.replace(`/events/${eventId}/public?cameraError=missing-attendee`)
    }
  }, [eventId, fingerprint, router])

  useEffect(() => {
    if (!fingerprint) return

    let isMounted = true

    async function loadCaptureState() {
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
            await readErrorMessage(response, "Unable to load camera state")
          )
        }

        const body = await readJsonBody<CaptureStateResponse>(
          response,
          "Unable to load camera state"
        )

        if (!isMounted) return

        setPhotosTaken(body.photosTaken)
        setPhotoLimit(body.photoLimit)

        if (body.photosTaken >= body.photoLimit) {
          router.replace(`/events/${eventId}/public?limitReached=1`)
        }
      } catch (loadError) {
        if (!isMounted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load camera state"
        )
      } finally {
        if (isMounted) {
          setIsLoadingState(false)
        }
      }
    }

    void loadCaptureState()

    return () => {
      isMounted = false
    }
  }, [eventId, fingerprint, router])

  useEffect(() => {
    if (isLoadingState || error || photoLimit <= 0 || photosLeft <= 0) return

    let active = true

    async function startCamera() {
      try {
        const environmentExact: MediaStreamConstraints = {
          video: {
            facingMode: {
              exact: "environment",
            },
          },
          audio: false,
        }
        const environmentIdeal: MediaStreamConstraints = {
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: false,
        }

        const stream = await navigator.mediaDevices
          .getUserMedia(environmentExact)
          .catch(() => navigator.mediaDevices.getUserMedia(environmentIdeal))

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()
        setIsCameraReady(true)

        const [track] = stream.getVideoTracks()
        const capabilities =
          track.getCapabilities?.() as MediaTrackCapabilitiesWithTorch

        if (capabilities?.torch) {
          setIsFlashSupported(true)

          try {
            await track.applyConstraints({
              advanced: [{ torch: true } as MediaTrackConstraintSet],
            })
            setIsFlashForced(true)
          } catch {
            setIsFlashForced(false)
          }
        }
      } catch {
        if (!active) return
        setError(
          "Camera access failed. Please allow camera permissions and try again."
        )
      }
    }

    void startCamera()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [error, isLoadingState, photoLimit, photosLeft])

  async function handleCapture() {
    if (isSubmitting || !isCameraReady || !fingerprint) return

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      setError("Camera is not ready yet")
      return
    }

    setError("")
    setIsSubmitting(true)

    try {
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Unable to prepare camera frame")
      }

      context.drawImage(video, 0, 0, width, height)
      const blob = await toBlob(canvas)
      const fileName = `capture-${Date.now()}.jpg`
      const file = new File([blob], fileName, { type: "image/jpeg" })
      const takenAt = new Date().toISOString()
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fingerprint", fingerprint)
      formData.append("takenAt", takenAt)

      const response = await fetch(`/events/${eventId}/public/capture`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? ""
        const errorBody = contentType.includes("application/json")
          ? ((await response.json().catch(() => ({}))) as CapturePhotoErrorResponse)
          : {}

        if (
          response.status === 409 &&
          errorBody.code === "PHOTO_LIMIT_REACHED"
        ) {
          router.replace(`/events/${eventId}/public?limitReached=1`)
          return
        }

        throw new Error(errorBody.error ?? "Unable to save photo")
      }

      const body = await readJsonBody<CapturePhotoResponse>(
        response,
        "Unable to save photo"
      )
      setPhotosTaken(body.photosTaken)
      setPhotoLimit(body.photoLimit)

      if (body.reachedLimit || body.photosTaken >= body.photoLimit) {
        router.replace(`/events/${eventId}/public?limitReached=1`)
      }
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Unable to save photo"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-4xl border border-border/60 bg-[#f8d547] p-4 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-black/10 bg-black/10 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-black/70">
                Disposable Mode
              </p>
              <p className="font-heading text-lg font-semibold text-black">
                {eventName}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-black/80">
              <HugeiconsIcon
                icon={isFlashForced ? FlashIcon : FlashOffIcon}
                size={14}
              />
              {isFlashSupported
                ? isFlashForced
                  ? "Flash on"
                  : "Flash unavailable"
                : "No flash support"}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-44 w-60 overflow-hidden rounded-md border-4 border-black/20 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-5 flex flex-col items-center gap-4">
            <Button
              type="button"
              size="icon-lg"
              className="size-16 rounded-full border-4 border-white/80 bg-white text-black hover:bg-white/90"
              onClick={handleCapture}
              disabled={
                !isCameraReady ||
                isSubmitting ||
                isLoadingState ||
                photosLeft <= 0
              }
            >
              <HugeiconsIcon icon={Camera01Icon} size={22} />
            </Button>

            <div className="text-center">
              <p className="font-heading text-4xl leading-none font-semibold text-black">
                {photosTaken}
                <span className="ml-1 text-base font-normal">
                  / {photoLimit || 0}
                </span>
              </p>
              <p className="text-sm text-black/80">
                {photosLeft} exposure{photosLeft === 1 ? "" : "s"} left
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(`/events/${eventId}/public`)}
          >
            Back to event
          </Button>
        </div>

        {isLoadingState && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Preparing your camera...
          </p>
        )}
        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
