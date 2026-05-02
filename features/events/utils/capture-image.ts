const JPEG_QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4]
const MAX_RESIZE_PASSES = 6
const MAX_BASE_DIMENSION = 2560
const RESIZE_SCALE_STEP = 0.82

export const MAX_UPLOAD_PHOTO_BYTES = 1 * 1024 * 1024

type CaptureImageOptions = {
  flashTimeout?: number,
  flashInterval?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getTorchCapabilities(track: MediaStreamTrack) {
  return track.getCapabilities() as MediaTrackCapabilities & {
    torch?: boolean
  }
}

function getInitialScale(width: number, height: number): number {
  const longestSide = Math.max(width, height)
  if (longestSide <= MAX_BASE_DIMENSION) return 1
  return MAX_BASE_DIMENSION / longestSide
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

export async function compressPhotoForUpload(
  blob: Blob,
  maxBytes: number
): Promise<Blob> {
  if (blob.size <= maxBytes) return blob

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
        if (!bestBlob || candidate.size < bestBlob.size) bestBlob = candidate
        if (candidate.size <= maxBytes) return candidate
      }

      scale *= RESIZE_SCALE_STEP
    }
  } finally {
    bitmap.close()
  }

  if (bestBlob) return bestBlob

  throw new Error("Unable to compress photo")
}

export async function captureImage(
  track: MediaStreamTrack,
  options?: CaptureImageOptions
): Promise<Blob> {
  const { flashTimeout = 750 } = options ?? {}
  const capabilities = getTorchCapabilities(track)
  const hasTorch = capabilities.torch === true
  const stream = new MediaStream([track])

  const maxWidth = (capabilities.width as ConstrainULongRange)?.max
  const maxHeight = (capabilities.height as ConstrainULongRange)?.max

  if (maxWidth && maxHeight) {
    await track.applyConstraints({ width: maxWidth, height: maxHeight })
  }

  if (hasTorch) {
    await track.applyConstraints({ advanced: [{ torch: true } as never] })
    await sleep(flashTimeout)
  }

  try {

    return await new Promise((resolve, reject) => {
      const video = document.createElement("video")
      video.srcObject = stream

      video.onloadedmetadata = async () => {
        try {
          await video.play()
          requestAnimationFrame(() => {
            const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight)
            const context = canvas.getContext("2d")

            if (!context) {
              reject(new Error("Unable to capture photo"))
              return
            }

            context.drawImage(video, 0, 0)
            canvas.convertToBlob({ type: "image/jpeg" }).then(resolve).catch(reject)
          })
        } catch (error) {
          reject(error)
        }
      }

      video.onerror = () => reject(new Error("Unable to capture photo"))
    })
  } finally {
    if (hasTorch) {
      await track.applyConstraints({ advanced: [{ torch: false } as never] })
    }
  }
}