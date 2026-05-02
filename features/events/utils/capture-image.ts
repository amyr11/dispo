const JPEG_QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4]
const MAX_RESIZE_PASSES = 6
const MAX_BASE_DIMENSION = 2560
const RESIZE_SCALE_STEP = 0.82
export const MAX_UPLOAD_PHOTO_BYTES = 1 * 1024 * 1024
const FIXED_BLACK_FLOOR = 0.08 // 98.9% black max; never pure black

type DisposableFilmProfile = {
  seed: number,
  exposure: number,
  contrast: number,
  saturation: number,
  tintR: number,
  tintG: number,
  tintB: number,
  tintStrength: number,
  warmth: number,
  fade: number,
  blurPx: number,
  blurMix: number,
  grain: number,
  whitePoint: number,
  whiteTintR: number,
  whiteTintG: number,
  whiteTintB: number,
  highlightKnee: number,
  highlightSoftness: number,
  vignette: number,
  vignetteCenterX: number,
  vignetteCenterY: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

function waitForVideoFrame(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const hasFrameCallback =
      typeof video.requestVideoFrameCallback === "function"

    if (!hasFrameCallback) {
      void nextAnimationFrame().then(() => resolve())
      return
    }

    let settled = false
    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      resolve()
    }, timeoutMs)

    video.requestVideoFrameCallback(() => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      resolve()
    })
  })
}

async function waitForVideoFrames(
  video: HTMLVideoElement,
  frameCount: number,
  timeoutPerFrameMs: number
): Promise<void> {
  for (let index = 0; index < frameCount; index += 1) {
    await waitForVideoFrame(video, timeoutPerFrameMs)
  }
}

async function drawSettledTorchFrame(
  video: HTMLVideoElement,
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number
): Promise<void> {
  // Some devices still return a transition frame right after torch engages.
  // Draw one frame, wait for the next true camera frame, then draw again.
  context.drawImage(video, 0, 0, width, height)
  await waitForVideoFrames(video, 1, 200)
  context.drawImage(video, 0, 0, width, height)
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

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function clampWithBlackFloor(value: number): number {
  return Math.max(FIXED_BLACK_FLOOR, clamp01(value))
}

function mix(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

function createSeededRandom(seed: number): () => number {
  let state = (seed ^ 0x9e3779b9) >>> 0

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function randomBetween(random: () => number, min: number, max: number): number {
  return mix(min, max, random())
}

function applySoftHighlightKnee(
  value: number,
  knee: number,
  softness: number
): number {
  if (value <= knee) return value
  const normalized = (value - knee) / (1 - knee)
  const compressed = 1 - Math.exp(-normalized * softness)
  return knee + (1 - knee) * compressed
}

function pixelNoise(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 1, 374761393)
  value = (value + Math.imul(y + 1, 668265263)) >>> 0
  value = (value + Math.imul(seed + 1, 362437)) >>> 0
  value ^= value >>> 13
  value = Math.imul(value, 1274126177) >>> 0
  return (value & 1023) / 1023 - 0.5
}

function createDisposableFilmProfile(): DisposableFilmProfile {
  const seed = (Math.random() * 0xffffffff) >>> 0
  const random = createSeededRandom(seed || 1)

  return {
    seed,
    exposure: randomBetween(random, -0.05, 0.03),
    contrast: randomBetween(random, 0.9, 1.08),
    saturation: randomBetween(random, 0.89, 1.0),
    tintR: randomBetween(random, 0.99, 1.0),
    tintG: randomBetween(random, 1.0, 1.25),
    tintB: randomBetween(random, 0.97, 0.995),
    tintStrength: randomBetween(random, 0.2, 0.28),
    warmth: randomBetween(random, 0.2, 0.24),
    fade: randomBetween(random, 0.01, 0.03),
    blurPx: randomBetween(random, 0.15, 1.4),
    blurMix: 1,
    grain: randomBetween(random, 0.05, 0.1),
    whitePoint: randomBetween(random, 0.86, 0.90),
    whiteTintR: randomBetween(random, 0.97, 0.995),
    whiteTintG: randomBetween(random, 0.97, 1.0),
    whiteTintB: randomBetween(random, 0.82, 0.88),
    highlightKnee: randomBetween(random, 0.7, 0.82),
    highlightSoftness: randomBetween(random, 1.7, 3.1),
    vignette: randomBetween(random, 0.1, 0.28),
    vignetteCenterX: randomBetween(random, 0.42, 0.58),
    vignetteCenterY: randomBetween(random, 0.42, 0.58),
  }
}

function applyDisposableFilmEffect(
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const profile = createDisposableFilmProfile()
  const sourceCanvas = context.canvas

  if (profile.blurPx > 0) {
    const blurCanvas = new OffscreenCanvas(width, height)
    const blurContext = blurCanvas.getContext("2d")

    if (blurContext) {
      blurContext.filter = `blur(${profile.blurPx.toFixed(2)}px)`
      blurContext.drawImage(sourceCanvas, 0, 0, width, height)

      context.save()
      context.globalAlpha = profile.blurMix
      context.drawImage(blurCanvas, 0, 0, width, height)
      context.restore()
    }
  }

  const imageData = context.getImageData(0, 0, width, height)
  const data = imageData.data

  const halfWidth = width / 2
  const halfHeight = height / 2
  const vignetteCenterX = width * profile.vignetteCenterX
  const vignetteCenterY = height * profile.vignetteCenterY

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4

      let red = data[index] / 255
      let green = data[index + 1] / 255
      let blue = data[index + 2] / 255

      red += profile.exposure
      green += profile.exposure
      blue += profile.exposure

      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722
      red = luma + (red - luma) * profile.saturation
      green = luma + (green - luma) * profile.saturation
      blue = luma + (blue - luma) * profile.saturation

      red = (red - 0.5) * profile.contrast + 0.5
      green = (green - 0.5) * profile.contrast + 0.5
      blue = (blue - 0.5) * profile.contrast + 0.5

      red = mix(red, red * profile.tintR, profile.tintStrength)
      green = mix(green, green * profile.tintG, profile.tintStrength)
      blue = mix(blue, blue * profile.tintB, profile.tintStrength)

      red *= 1 + profile.warmth * 0.6
      green *= 1 + profile.warmth * 0.22
      blue *= 1 - profile.warmth * 0.5

      red = mix(red, 0.93, profile.fade)
      green = mix(green, 0.9, profile.fade)
      blue = mix(blue, 0.86, profile.fade)

      const normalizedX = (x - vignetteCenterX) / halfWidth
      const normalizedY = (y - vignetteCenterY) / halfHeight
      const radialDistance = normalizedX * normalizedX + normalizedY * normalizedY
      const vignetteFalloff = clamp01((radialDistance - 0.15) / 0.95)
      const vignetteMultiplier = 1 - profile.vignette * vignetteFalloff

      red *= vignetteMultiplier
      green *= vignetteMultiplier
      blue *= vignetteMultiplier

      const grainBase = pixelNoise(x, y, profile.seed)
      const grainRed = grainBase + pixelNoise(x + 31, y + 17, profile.seed) * 0.35
      const grainGreen = grainBase + pixelNoise(x + 13, y + 53, profile.seed) * 0.28
      const grainBlue = grainBase + pixelNoise(x + 47, y + 7, profile.seed) * 0.42

      red += grainRed * profile.grain
      green += grainGreen * profile.grain
      blue += grainBlue * profile.grain

      red = applySoftHighlightKnee(red, profile.highlightKnee, profile.highlightSoftness)
      green = applySoftHighlightKnee(green, profile.highlightKnee, profile.highlightSoftness)
      blue = applySoftHighlightKnee(blue, profile.highlightKnee, profile.highlightSoftness)

      const peak = Math.max(red, green, blue)
      if (peak > profile.whitePoint) {
        const scale = profile.whitePoint / peak
        red *= scale
        green *= scale
        blue *= scale
      }

      const highlightLuma = red * 0.2126 + green * 0.7152 + blue * 0.0722
      const highlightAmount = clamp01((highlightLuma - 0.62) / 0.35)

      red = mix(red, profile.whitePoint * profile.whiteTintR, highlightAmount * 0.65)
      green = mix(green, profile.whitePoint * profile.whiteTintG, highlightAmount * 0.65)
      blue = mix(blue, profile.whitePoint * profile.whiteTintB, highlightAmount * 0.65)

      data[index] = Math.round(clampWithBlackFloor(red) * 255)
      data[index + 1] = Math.round(clampWithBlackFloor(green) * 255)
      data[index + 2] = Math.round(clampWithBlackFloor(blue) * 255)
    }
  }

  context.putImageData(imageData, 0, 0)
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
  track: MediaStreamTrack
): Promise<Blob> {
  const flashTimeout = Math.round(randomBetween(Math.random, 700, 900))
  const capabilities = getTorchCapabilities(track)
  const hasTorch = capabilities.torch === true
  let torchEnabled = false
  const stream = new MediaStream([track])

  const maxWidth = (capabilities.width as ConstrainULongRange)?.max
  const maxHeight = (capabilities.height as ConstrainULongRange)?.max

  if (maxWidth && maxHeight) {
    await track.applyConstraints({ width: maxWidth, height: maxHeight })
  }

  if (hasTorch) {
    await track.applyConstraints({ advanced: [{ torch: true } as never] })
    torchEnabled = true
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
            void (async () => {
              try {
                const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight)
                const context = canvas.getContext("2d")

                if (!context) {
                  reject(new Error("Unable to capture photo"))
                  return
                }

                context.drawImage(video, 0, 0)

                // Turn torch off as soon as we have the captured frame.
                if (hasTorch && torchEnabled) {
                  await track.applyConstraints({
                    advanced: [{ torch: false } as never],
                  })
                  torchEnabled = false
                }

                applyDisposableFilmEffect(context, video.videoWidth, video.videoHeight)
                const blob = await canvas.convertToBlob({ type: "image/jpeg" })
                resolve(blob)
              } catch (error) {
                reject(error)
              }
            })()
          })
        } catch (error) {
          reject(error)
        }
      }

      video.onerror = () => reject(new Error("Unable to capture photo"))
    })
  } finally {
    if (hasTorch && torchEnabled) {
      await track.applyConstraints({ advanced: [{ torch: false } as never] })
      torchEnabled = false
    }
  }
}

export async function captureImageFastFromVideo(
  video: HTMLVideoElement,
  track: MediaStreamTrack
): Promise<Blob> {
  const captureWidth = 1200
  const captureHeight = 1600

  if (!captureWidth || !captureHeight) {
    throw new Error("Camera preview is not ready")
  }

  const capabilities = getTorchCapabilities(track)
  const hasTorch = capabilities.torch === true
  const flashDurationMs = 600
  const jpegQuality = 0.9

  let torchEnabled = false

  try {
    const canvas = new OffscreenCanvas(captureWidth, captureHeight)
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Unable to capture photo")
    }

    if (hasTorch) {
      await track.applyConstraints({ advanced: [{ torch: true } as never] })
      torchEnabled = true
      // Wait for real camera frames after torch-on instead of relying on wall-clock only.
      await waitForVideoFrames(video, 3, 220)
      await sleep(flashDurationMs)
      await waitForVideoFrames(video, 1, 180)
      await drawSettledTorchFrame(video, context, captureWidth, captureHeight)
      // Keep torch for one more frame after draw to avoid sensor readout edge cases.
      await waitForVideoFrames(video, 1, 180)
    } else {
      context.drawImage(video, 0, 0, captureWidth, captureHeight)
    }

    // Capture first while torch is still on, then turn torch off.
    if (hasTorch && torchEnabled) {
      await track.applyConstraints({ advanced: [{ torch: false } as never] })
      torchEnabled = false
    }

    return await canvas.convertToBlob({ type: "image/jpeg", quality: jpegQuality })
  } finally {
    if (hasTorch && torchEnabled) {
      await track.applyConstraints({ advanced: [{ torch: false } as never] })
    }
  }
}

export async function applyDisposableFilmEffectToBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext("2d")

  if (!context) {
    bitmap.close()
    throw new Error("Unable to process photo")
  }

  try {
    context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height)
    applyDisposableFilmEffect(context, bitmap.width, bitmap.height)
    return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.86 })
  } finally {
    bitmap.close()
  }
}
