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
  zoom?: MediaSettingsRange
}

type FillLightModeLike = "auto" | "off" | "flash"

type LensOption = {
  deviceId: string
  label: string
}

const MAX_UPLOAD_PHOTO_BYTES = 1 * 1024 * 1024
const JPEG_QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4]
const MAX_RESIZE_PASSES = 6
const MAX_BASE_DIMENSION = 2560
const RESIZE_SCALE_STEP = 0.82
const frontCameraLabelHints = ["front", "user", "selfie"]

function isFrontCameraLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return frontCameraLabelHints.some((hint) => normalized.includes(hint))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function openCameraStreamByDeviceId(deviceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: {
        exact: deviceId,
      },
    },
    audio: false,
  })
}

async function listLensOptions(): Promise<LensOption[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return []
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoInputs = devices.filter((device) => device.kind === "videoinput")

  return videoInputs
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
    }))
    .filter((device) => !isFrontCameraLabel(device.label))
}

async function probeBackFacingLenses(
  lenses: LensOption[]
): Promise<{ rearLenses: LensOption[]; flashLensDeviceId: string | null }> {
  const rearLenses: LensOption[] = []
  let flashLensDeviceId: string | null = null

  for (const lens of lenses) {
    let stream: MediaStream | null = null

    try {
      stream = await openCameraStreamByDeviceId(lens.deviceId)
      const [track] = stream.getVideoTracks()

      if (!track) {
        continue
      }

      // Give Chrome a moment to populate capabilities/settings reliably.
      await sleep(70)

      const settings = track.getSettings?.()
      const capabilities =
        track.getCapabilities?.() as MediaTrackCapabilitiesWithTorch
      const isRearLens =
        settings?.facingMode === "environment" ||
        (settings?.facingMode !== "user" && !isFrontCameraLabel(lens.label))

      if (!isRearLens) {
        continue
      }

      rearLenses.push(lens)
      if (!flashLensDeviceId && capabilities?.torch === true) {
        flashLensDeviceId = lens.deviceId
      }
    } catch {
      // Ignore lenses that cannot be opened/probed.
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }

  return { rearLenses, flashLensDeviceId }
}

async function openEnvironmentStream(): Promise<MediaStream> {
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

  return navigator.mediaDevices
    .getUserMedia(environmentExact)
    .catch(() => navigator.mediaDevices.getUserMedia(environmentIdeal))
}

async function forceTorchOff(track: MediaStreamTrack): Promise<void> {
  try {
    await track.applyConstraints({
      advanced: [{ torch: false } as MediaTrackConstraintSet],
    })
  } catch {
    // Ignore torch-off failures.
  }
}

type ImageCaptureLike = {
  takePhoto: (photoSettings?: {
    fillLightMode?: FillLightModeLike
    imageHeight?: number
    imageWidth?: number
    redEyeReduction?: boolean
  }) => Promise<Blob>
  getPhotoCapabilities?: () => Promise<{
    fillLightMode?: FillLightModeLike[]
  }>
}

type WindowWithImageCapture = Window & {
  ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike
}

function getImageCaptureInstance(
  track: MediaStreamTrack
): ImageCaptureLike | null {
  const imageCaptureConstructor = (window as WindowWithImageCapture).ImageCapture
  if (!imageCaptureConstructor) {
    return null
  }

  try {
    return new imageCaptureConstructor(track)
  } catch {
    return null
  }
}

async function getPreferredFillLightMode(
  imageCapture: ImageCaptureLike
): Promise<FillLightModeLike | null> {
  try {
    const modes = (await imageCapture.getPhotoCapabilities?.())?.fillLightMode
    if (!modes?.length) return null
    if (modes.includes("flash")) return "flash"
    if (modes.includes("off")) return "off"
    return null
  } catch {
    return null
  }
}

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to compress photo"))
          return
        }
        resolve(blob)
      },
      "image/jpeg",
      quality
    )
  })
}

function getInitialScale(width: number, height: number): number {
  const longestSide = Math.max(width, height)
  if (longestSide <= MAX_BASE_DIMENSION) {
    return 1
  }
  return MAX_BASE_DIMENSION / longestSide
}

async function compressPhotoForUpload(
  blob: Blob,
  maxBytes: number
): Promise<Blob> {
  if (blob.size <= maxBytes) {
    return blob
  }

  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) {
    bitmap.close()
    throw new Error("Unable to prepare photo compression")
  }

  let scale = getInitialScale(bitmap.width, bitmap.height)
  let bestBlob: Blob | null = null

  try {
    for (let pass = 0; pass < MAX_RESIZE_PASSES; pass += 1) {
      const targetWidth = Math.max(1, Math.round(bitmap.width * scale))
      const targetHeight = Math.max(1, Math.round(bitmap.height * scale))
      canvas.width = targetWidth
      canvas.height = targetHeight
      context.clearRect(0, 0, targetWidth, targetHeight)
      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

      for (const quality of JPEG_QUALITY_STEPS) {
        const candidate = await toJpegBlob(canvas, quality)
        if (!bestBlob || candidate.size < bestBlob.size) {
          bestBlob = candidate
        }
        if (candidate.size <= maxBytes) {
          return candidate
        }
      }

      scale *= RESIZE_SCALE_STEP
    }
  } finally {
    bitmap.close()
  }

  if (bestBlob) {
    return bestBlob
  }

  throw new Error("Unable to compress photo")
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

export function PublicEventCamera({ eventId, eventName }: PublicEventCameraProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState("")
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFlashSupported, setIsFlashSupported] = useState(false)
  const [isFlashForced, setIsFlashForced] = useState(false)
  const [lensOptions, setLensOptions] = useState<LensOption[]>([])
  const [selectedLensDeviceId, setSelectedLensDeviceId] = useState("")
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
        setIsCameraReady(false)
        setIsFlashSupported(false)
        setIsFlashForced(false)
        const lenses = await listLensOptions()
        const { rearLenses, flashLensDeviceId } = await probeBackFacingLenses(
          lenses
        )
        const availableLenses = rearLenses.length ? rearLenses : lenses

        if (!availableLenses.length) {
          throw new Error("No rear camera lenses detected on this device.")
        }

        setLensOptions(availableLenses)

        const validSelectedLens = availableLenses.find(
          (lens) => lens.deviceId === selectedLensDeviceId
        )
        const nextLensDeviceId =
          validSelectedLens?.deviceId ??
          flashLensDeviceId ??
          availableLenses[0].deviceId

        if (selectedLensDeviceId !== nextLensDeviceId) {
          setSelectedLensDeviceId(nextLensDeviceId)
        }

        const stream = await openCameraStreamByDeviceId(nextLensDeviceId)
          .catch(() => openEnvironmentStream())

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
        const currentDeviceId = track.getSettings?.().deviceId ?? ""
        const currentFacingMode = track.getSettings?.().facingMode
        const zoomRange = capabilities?.zoom
        const minZoom = zoomRange?.min
        const maxZoom = zoomRange?.max

        if (currentFacingMode === "user") {
          throw new Error("Front cameras are not allowed. Please select a rear lens.")
        }
        if (!availableLenses.some((lens) => lens.deviceId === currentDeviceId)) {
          throw new Error("Front cameras are not allowed. Please select a rear lens.")
        }

        if (
          typeof minZoom === "number" &&
          typeof maxZoom === "number" &&
          minZoom <= 1 &&
          maxZoom >= 1
        ) {
          try {
            await track.applyConstraints({
              advanced: [{ zoom: 1 } as MediaTrackConstraintSet],
            })
          } catch {
            // Ignore zoom constraint failures and continue camera startup.
          }
        }

        const torchSupported = capabilities?.torch === true
        const imageCapture = getImageCaptureInstance(track)
        const fillLightMode = imageCapture
          ? await getPreferredFillLightMode(imageCapture)
          : null
        setIsFlashSupported(torchSupported || fillLightMode === "flash")
        if (torchSupported) {
          await forceTorchOff(track)
        }
        setIsFlashForced(false)
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

    const video = videoRef.current

    if (!video) {
      setError("Camera is not ready yet")
      return
    }

    setError("")
    setIsSubmitting(true)
    let captureTrack: MediaStreamTrack | null = null

    try {
      captureTrack = streamRef.current?.getVideoTracks()[0] ?? null
      if (!captureTrack) {
        throw new Error("Unable to access camera track")
      }

      const imageCapture = getImageCaptureInstance(captureTrack)
      if (!imageCapture) {
        throw new Error("ImageCapture is not supported on this device/browser")
      }

      const fillLightMode = await getPreferredFillLightMode(imageCapture)
      const canUseFlash = fillLightMode === "flash"
      setIsFlashSupported(
        canUseFlash ||
          (
            captureTrack.getCapabilities?.() as MediaTrackCapabilitiesWithTorch
          )?.torch === true
      )
      setIsFlashForced(canUseFlash)
      const blob = await imageCapture.takePhoto(
        fillLightMode ? { fillLightMode } : undefined
      )
      setIsFlashForced(false)

      const compressedBlob = await compressPhotoForUpload(
        blob,
        MAX_UPLOAD_PHOTO_BYTES
      )
      if (compressedBlob.size > MAX_UPLOAD_PHOTO_BYTES) {
        throw new Error("Unable to compress photo to 1MB. Try another lens.")
      }
      const fileName = `capture-${Date.now()}.jpg`
      const file = new File([compressedBlob], fileName, {
        type: "image/jpeg",
      })
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
      setIsFlashForced(false)
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
                  : "Flash ready"
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

          <div className="mt-3">
            <label
              htmlFor="lens-picker"
              className="mb-1 block text-xs uppercase tracking-[0.12em] text-black/70"
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
              {!lensOptions.length && <option value="">Detecting cameras…</option>}
              {lensOptions.map((lens) => (
                <option key={lens.deviceId} value={lens.deviceId}>
                  {lens.label}
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
        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
