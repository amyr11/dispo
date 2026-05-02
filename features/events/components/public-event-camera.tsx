"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera01Icon, FlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import {
  MAX_UPLOAD_PHOTO_BYTES,
  captureImage,
  compressPhotoForUpload,
} from "@/features/events/utils/capture-image"
import {
  type LensOption,
  isLikelyFrontCameraLabel,
  listLensOptions,
  openCameraStreamByDeviceId,
  openEnvironmentStream,
  probeRearLensesWithFlash,
} from "@/features/events/utils/public-event-camera-lenses"
import {
  attendeeFingerprintKey,
  getStoredPublicAttendeeValue,
} from "@/features/events/utils/public-attendee-storage"

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

function isPhoneDevice(): boolean {
  if (typeof navigator === "undefined") return false

  const navigatorWithUAData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean }
  }

  if (navigatorWithUAData.userAgentData?.mobile) return true
  return /android|iphone|ipod|mobile/i.test(navigator.userAgent)
}

function isFrontFacingStream(stream: MediaStream, lensLabel?: string): boolean {
  const [track] = stream.getVideoTracks()
  if (!track) return false

  const facingMode = track.getSettings?.().facingMode
  if (facingMode === "user") return true
  if (facingMode === "environment") return false

  if (lensLabel) return isLikelyFrontCameraLabel(lensLabel)
  return false
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return fallbackMessage

  const body = (await response.json().catch(() => null)) as {
    error?: string
  } | null

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

export function PublicEventCamera({
  eventId,
  eventName,
}: PublicEventCameraProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [error, setError] = useState("")
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lensOptions, setLensOptions] = useState<LensOption[]>([])
  const [selectedLensDeviceId, setSelectedLensDeviceId] = useState("")
  const [photosTaken, setPhotosTaken] = useState(0)
  const [photoLimit, setPhotoLimit] = useState(0)
  const [fingerprint] = useState(() => {
    if (typeof window === "undefined") return ""
    return getStoredPublicAttendeeValue(attendeeFingerprintKey(eventId))
  })

  const photosLeft = useMemo(
    () => Math.max(0, photoLimit - photosTaken),
    [photoLimit, photosTaken]
  )

  const selectedLensSupportsFlash = useMemo(
    () =>
      lensOptions.find((lens) => lens.deviceId === selectedLensDeviceId)
        ?.supportsFlash ?? false,
    [lensOptions, selectedLensDeviceId]
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
          { method: "GET", credentials: "include", cache: "no-store" }
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
        if (isMounted) setIsLoadingState(false)
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
        setIsCameraReady(false)
        setError("")

        const lenses = await listLensOptions()
        const rearLenses = await probeRearLensesWithFlash(lenses)
        const isPhone = isPhoneDevice()
        const labelByDeviceId = new Map(
          lenses.map((lens) => [lens.deviceId, lens.label] as const)
        )

        const nonFrontLenses = lenses.filter(
          (lens) => !isLikelyFrontCameraLabel(lens.label)
        )
        const flashByDeviceId = new Map(
          rearLenses.map((lens) => [lens.deviceId, lens.supportsFlash] as const)
        )
        const selectableLenses = nonFrontLenses.map((lens) => ({
          ...lens,
          supportsFlash: flashByDeviceId.get(lens.deviceId) ?? false,
        }))
        const firstFlashLens = selectableLenses.find((lens) => lens.supportsFlash)

        setLensOptions(selectableLenses)

        const validSelectedLens = selectableLenses.find(
          (lens) => lens.deviceId === selectedLensDeviceId
        )
        const preferredLensDeviceId =
          validSelectedLens?.deviceId ??
          firstFlashLens?.deviceId ??
          selectableLenses[0]?.deviceId

        if (
          preferredLensDeviceId &&
          preferredLensDeviceId !== selectedLensDeviceId
        ) {
          setSelectedLensDeviceId(preferredLensDeviceId)
        }

        const candidateDeviceIds: string[] = []
        const addCandidate = (deviceId?: string) => {
          if (!deviceId) return
          if (candidateDeviceIds.includes(deviceId)) return
          candidateDeviceIds.push(deviceId)
        }

        addCandidate(preferredLensDeviceId)
        addCandidate(validSelectedLens?.deviceId)
        addCandidate(firstFlashLens?.deviceId)
        rearLenses.forEach((lens) => addCandidate(lens.deviceId))
        nonFrontLenses.forEach((lens) => addCandidate(lens.deviceId))
        lenses.forEach((lens) => addCandidate(lens.deviceId))

        let stream: MediaStream | null = null

        for (const deviceId of candidateDeviceIds) {
          if (stream) break

          try {
            const nextStream = await openCameraStreamByDeviceId(deviceId)
            const lensLabel = labelByDeviceId.get(deviceId)

            if (isPhone && isFrontFacingStream(nextStream, lensLabel)) {
              nextStream.getTracks().forEach((track) => track.stop())
              continue
            }

            stream = nextStream
          } catch {
            // Continue through all fallback options.
          }
        }

        if (!stream) {
          try {
            stream = await openEnvironmentStream()

            if (isPhone && isFrontFacingStream(stream)) {
              stream.getTracks().forEach((track) => track.stop())
              stream = null
            }
          } catch {
            stream = null
          }
        }

        if (!stream) {
          throw new Error(
            "No rear camera lenses detected on this device. Please allow camera access and try again."
          )
        }

        const activeTrack = stream.getVideoTracks()[0]
        const activeDeviceId = activeTrack?.getSettings?.().deviceId

        if (activeDeviceId) {
          const matchedLens = selectableLenses.find(
            (lens) => lens.deviceId === activeDeviceId
          )

          if (matchedLens && matchedLens.deviceId !== selectedLensDeviceId) {
            setSelectedLensDeviceId(matchedLens.deviceId)
          }
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error("Unable to render camera preview")
        }

        if (isPhone && isFrontFacingStream(stream)) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error("Front cameras are not allowed on phones.")
        }

        video.srcObject = stream
        await video.play()
        setIsCameraReady(true)
      } catch (cameraError) {
        if (!active) return

        setError(
          cameraError instanceof Error
            ? cameraError.message
            : "Camera access failed. Please allow camera permissions and try again."
        )
      }
    }

    void startCamera()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [error, isLoadingState, photoLimit, photosLeft, selectedLensDeviceId])

  async function handleCapture() {
    if (isSubmitting || !isCameraReady || !fingerprint) return

    setError("")
    setIsSubmitting(true)

    try {
      const captureTrack = streamRef.current?.getVideoTracks()[0] ?? null
      if (!captureTrack) throw new Error("Unable to access camera track")

      const blob = await captureImage(captureTrack)
      const compressedBlob = await compressPhotoForUpload(
        blob,
        MAX_UPLOAD_PHOTO_BYTES
      )

      if (compressedBlob.size > MAX_UPLOAD_PHOTO_BYTES) {
        throw new Error("Unable to compress photo to 1MB. Try another lens.")
      }

      const fileName = `capture-${Date.now()}.jpg`
      const file = new File([compressedBlob], fileName, { type: "image/jpeg" })
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
          ? ((await response
              .json()
              .catch(() => ({}))) as CapturePhotoErrorResponse)
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
              <p className="text-xs tracking-[0.18em] text-black/70 uppercase">
                Disposable Mode
              </p>
              <p className="font-heading text-lg font-semibold text-black">
                {eventName}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-black/15 bg-white/50 px-2 py-1 text-xs text-black/80">
              <HugeiconsIcon icon={FlashIcon} size={14} />
              {selectedLensSupportsFlash ? "Flash on" : "Flash off"}
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

          <div className="mt-3">
            <label
              htmlFor="lens-picker"
              className="mb-1 block text-xs tracking-[0.12em] text-black/70 uppercase"
            >
              Lens
            </label>
            <select
              id="lens-picker"
              value={selectedLensDeviceId}
              onChange={(event) => {
                setError("")
                setSelectedLensDeviceId(event.target.value)
              }}
              disabled={isSubmitting || !lensOptions.length}
              className="h-10 w-full rounded-md border border-black/20 bg-white/90 px-3 text-sm text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!lensOptions.length && (
                <option value="">Detecting cameras…</option>
              )}
              {lensOptions.map((lens) => (
                <option key={lens.deviceId} value={lens.deviceId}>
                  {lens.label}
                  {lens.supportsFlash ? " (Flash)" : ""}
                </option>
              ))}
            </select>
          </div>

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
        {error && (
          <p className="mt-3 text-center text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}
