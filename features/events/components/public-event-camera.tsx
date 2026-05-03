"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera01Icon, FlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import {
  MAX_UPLOAD_PHOTO_BYTES,
  applyDisposableFilmEffectToBlob,
  captureImageFastFromVideo,
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

type QueuedCapture = {
  id: string
  takenAt: string
  rawBlob: Blob
}

type ProcessedCapture = {
  id: string
  takenAt: string
  file: File
  attempts: number
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
  const pendingCapturesRef = useRef<QueuedCapture[]>([])
  const processedCapturesRef = useRef<ProcessedCapture[]>([])
  const isProcessingRef = useRef(false)
  const isUploadingRef = useRef(false)
  const uploadTimerRef = useRef<number | null>(null)
  const captureIdRef = useRef(0)

  const [error, setError] = useState("")
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [queuedCapturesCount, setQueuedCapturesCount] = useState(0)
  const [failedCapturesCount, setFailedCapturesCount] = useState(0)
  const [blackBlinkActive, setBlackBlinkActive] = useState(false)
  const [uploadErrorToast, setUploadErrorToast] = useState("")
  const [lensOptions, setLensOptions] = useState<LensOption[]>([])
  const [selectedLensDeviceId, setSelectedLensDeviceId] = useState("")
  const [photosTaken, setPhotosTaken] = useState(0)
  const [photoLimit, setPhotoLimit] = useState(0)
  const [fingerprint] = useState(() => {
    if (typeof window === "undefined") return ""
    return getStoredPublicAttendeeValue(attendeeFingerprintKey(eventId))
  })

  const captureSlotsLeft = useMemo(
    () => Math.max(0, photoLimit - photosTaken - queuedCapturesCount),
    [photoLimit, photosTaken, queuedCapturesCount]
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

  useEffect(
    () => () => {
      if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    },
    []
  )

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
    if (isLoadingState || photoLimit <= 0) return

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
        const firstFlashLens = selectableLenses.find(
          (lens) => lens.supportsFlash
        )

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
  }, [isLoadingState, photoLimit, selectedLensDeviceId])

  async function processQueuedCaptures() {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    try {
      while (pendingCapturesRef.current.length > 0) {
        const item = pendingCapturesRef.current.shift()
        if (!item) continue

        try {
          const effectedBlob = await applyDisposableFilmEffectToBlob(
            item.rawBlob
          )
          const compressedBlob = await compressPhotoForUpload(
            effectedBlob,
            MAX_UPLOAD_PHOTO_BYTES
          )

          if (compressedBlob.size > MAX_UPLOAD_PHOTO_BYTES) {
            throw new Error(
              "Unable to compress photo to 1MB. Try another lens."
            )
          }

          const file = new File([compressedBlob], `capture-${item.id}.jpg`, {
            type: "image/jpeg",
          })

          processedCapturesRef.current.push({
            id: item.id,
            takenAt: item.takenAt,
            file,
            attempts: 0,
          })
        } catch {
          setFailedCapturesCount((prev) => prev + 1)
          setQueuedCapturesCount((prev) => Math.max(0, prev - 1))
          setUploadErrorToast("A capture failed to process and was skipped.")
        }
      }
    } finally {
      isProcessingRef.current = false
      scheduleUploadIfIdle()
    }
  }

  async function uploadProcessedCaptures() {
    if (isUploadingRef.current || !fingerprint) return
    if (pendingCapturesRef.current.length > 0 || isProcessingRef.current) return
    if (!processedCapturesRef.current.length) return
    isUploadingRef.current = true

    try {
      while (processedCapturesRef.current.length > 0) {
        const item = processedCapturesRef.current[0]
        const formData = new FormData()
        formData.append("file", item.file)
        formData.append("fingerprint", fingerprint)
        formData.append("takenAt", item.takenAt)

        try {
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

          processedCapturesRef.current.shift()
          setQueuedCapturesCount((prev) => Math.max(0, prev - 1))
          setPhotosTaken(body.photosTaken)
          setPhotoLimit(body.photoLimit)

          if (body.reachedLimit || body.photosTaken >= body.photoLimit) {
            router.replace(`/events/${eventId}/public?limitReached=1`)
            return
          }
        } catch (uploadError) {
          item.attempts += 1
          if (item.attempts < 3) {
            await new Promise((resolve) => window.setTimeout(resolve, 400))
            continue
          }

          processedCapturesRef.current.shift()
          setQueuedCapturesCount((prev) => Math.max(0, prev - 1))
          setFailedCapturesCount((prev) => prev + 1)
          setUploadErrorToast(
            uploadError instanceof Error
              ? `Capture failed after retries: ${uploadError.message}`
              : "Capture failed after retries."
          )
        }
      }
    } finally {
      isUploadingRef.current = false
    }
  }

  function scheduleUploadIfIdle() {
    if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    uploadTimerRef.current = window.setTimeout(() => {
      void uploadProcessedCaptures()
    }, 300)
  }

  async function handleCapture() {
    if (
      isCapturing ||
      !isCameraReady ||
      !fingerprint ||
      captureSlotsLeft <= 0
    ) {
      return
    }

    setError("")
    setIsCapturing(true)

    try {
      const captureTrack = streamRef.current?.getVideoTracks()[0] ?? null
      const video = videoRef.current
      if (!captureTrack || !video) throw new Error("Unable to access camera")

      setBlackBlinkActive(true)
      const rawBlob = await captureImageFastFromVideo(video, captureTrack)

      const captureId = `${Date.now()}-${captureIdRef.current}`
      captureIdRef.current += 1
      const queued: QueuedCapture = {
        id: captureId,
        takenAt: new Date().toISOString(),
        rawBlob,
      }

      pendingCapturesRef.current.push(queued)
      setQueuedCapturesCount((prev) => prev + 1)
      void processQueuedCaptures()
    } catch (captureError) {
      setBlackBlinkActive(false)
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Unable to capture photo"
      )
    } finally {
      setBlackBlinkActive(false)
      setIsCapturing(false)
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
            <div className="relative h-44 w-60 overflow-hidden rounded-md border-4 border-black/20 bg-black">
              <div
                className={`pointer-events-none absolute z-20 h-44 w-60 bg-black ${
                  blackBlinkActive
                    ? "opacity-100 transition-none"
                    : "opacity-0 transition-opacity duration-1500"
                }`}
              />
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="relative h-full w-full object-cover"
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
              disabled={isCapturing || !lensOptions.length}
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
                isCapturing ||
                isLoadingState ||
                captureSlotsLeft <= 0
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
                {captureSlotsLeft} exposure{captureSlotsLeft === 1 ? "" : "s"}{" "}
                left
              </p>
              {!!queuedCapturesCount && (
                <p className="text-xs text-black/70">
                  {queuedCapturesCount} queued for processing/upload
                </p>
              )}
              {!!failedCapturesCount && (
                <p className="text-xs text-destructive">
                  {failedCapturesCount} capture
                  {failedCapturesCount === 1 ? "" : "s"} failed
                </p>
              )}
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
        {uploadErrorToast && (
          <div className="fixed right-4 bottom-4 z-50 rounded-md border bg-background px-4 py-3 text-sm shadow-lg">
            <p className="font-medium text-destructive">
              Capture upload failed
            </p>
            <p>{uploadErrorToast}</p>
            <button
              type="button"
              className="mt-2 text-xs text-muted-foreground underline"
              onClick={() => setUploadErrorToast("")}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
