const JPEG_QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4]
const MAX_RESIZE_PASSES = 6
const MAX_BASE_DIMENSION = 2560
const CAPTURE_TARGET_LONGEST_SIDE = 1920
const RESIZE_SCALE_STEP = 0.82
export const MAX_UPLOAD_PHOTO_BYTES = 1 * 1024 * 1024
const FIXED_BLACK_FLOOR = 0.15
const MAX_TRACK_TORCH_CACHE_SIZE = 8

type ReusableCaptureSurface = {
  canvas: OffscreenCanvas | HTMLCanvasElement
  context: Capture2DContext
  width: number
  height: number
}

type Capture2DContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

export type VideoCaptureSession = {
  video: HTMLVideoElement
  track: MediaStreamTrack
  trackId: string
  captureWidth: number
  captureHeight: number
  hasTorch: boolean
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    return canvas
  }

  throw new Error("Canvas is not available in this environment")
}

function get2DContext(canvas: OffscreenCanvas | HTMLCanvasElement): Capture2DContext {
  const context = canvas.getContext("2d")
  if (!context || !("drawImage" in context)) {
    throw new Error("Unable to initialize capture context")
  }
  return context as Capture2DContext
}

function createReusableCaptureSurface(): ReusableCaptureSurface {
  const canvas = createCanvas(1, 1)
  const context = get2DContext(canvas)

  return {
    canvas,
    context,
    width: 1,
    height: 1,
  }
}

let reusableCaptureSurface: ReusableCaptureSurface | null = null

const torchSupportByTrackId = new Map<string, boolean>()

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
  context: Capture2DContext,
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

function getOrProbeTorchSupport(track: MediaStreamTrack): boolean {
  const trackId = track.id
  const cached = torchSupportByTrackId.get(trackId)
  if (cached !== undefined) return cached

  const hasTorch = getTorchCapabilities(track).torch === true
  torchSupportByTrackId.set(trackId, hasTorch)

  if (torchSupportByTrackId.size > MAX_TRACK_TORCH_CACHE_SIZE) {
    const oldestKey = torchSupportByTrackId.keys().next().value
    if (oldestKey) {
      torchSupportByTrackId.delete(oldestKey)
    }
  }

  return hasTorch
}

function getReusableCaptureSurface(
  width: number,
  height: number
): ReusableCaptureSurface {
  if (!reusableCaptureSurface) {
    reusableCaptureSurface = createReusableCaptureSurface()
  }

  if (reusableCaptureSurface.width !== width || reusableCaptureSurface.height !== height) {
    reusableCaptureSurface.canvas.width = width
    reusableCaptureSurface.canvas.height = height
    reusableCaptureSurface.width = width
    reusableCaptureSurface.height = height
  }

  return reusableCaptureSurface
}

async function convertCanvasToJpegBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return await canvas.convertToBlob({ type: "image/jpeg", quality })
  }

  return await toJpegBlob(canvas, quality)
}

function getInitialScale(width: number, height: number): number {
  const longestSide = Math.max(width, height)
  if (longestSide <= MAX_BASE_DIMENSION) return 1
  return MAX_BASE_DIMENSION / longestSide
}

function getCaptureDimensions(
  sourceWidth: number,
  sourceHeight: number
): { width: number, height: number } {
  const longestSide = Math.max(sourceWidth, sourceHeight)
  const targetLongestSide = Math.min(CAPTURE_TARGET_LONGEST_SIDE, MAX_BASE_DIMENSION)

  if (longestSide >= targetLongestSide) {
    return { width: sourceWidth, height: sourceHeight }
  }

  const scale = targetLongestSide / longestSide
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
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

function drawEdgeContactBurn(
  context: Capture2DContext,
  width: number,
  height: number,
  edge: number,
  alpha: number,
  depth: number,
  extents?: number[]
): void {
  context.save()
  context.globalCompositeOperation = "color-dodge"

  if ((edge === 2 || edge === 3) && extents && extents.length > 1) {
    const shape = new Path2D()
    const pointCount = extents.length
    const yStep = height / (pointCount - 1)
    const lockScale = Math.max(0.08, Math.min(1, depth / Math.max(1, width)))

    if (edge === 2) {
      shape.moveTo(0, 0)
      shape.lineTo((extents[0] ?? 0) * lockScale, 0)
      for (let pointIndex = 1; pointIndex < pointCount; pointIndex += 1) {
        const prevY = (pointIndex - 1) * yStep
        const currY = pointIndex * yStep
        const midY = (prevY + currY) * 0.5
        const prevExtent = (extents[pointIndex - 1] ?? 0) * lockScale
        const currExtent = (extents[pointIndex] ?? 0) * lockScale
        shape.quadraticCurveTo(prevExtent, prevY, (prevExtent + currExtent) * 0.5, midY)
      }
      shape.lineTo(0, height)
    } else {
      shape.moveTo(width, 0)
      shape.lineTo(width - (extents[0] ?? 0) * lockScale, 0)
      for (let pointIndex = 1; pointIndex < pointCount; pointIndex += 1) {
        const prevY = (pointIndex - 1) * yStep
        const currY = pointIndex * yStep
        const midY = (prevY + currY) * 0.5
        const prevX = width - (extents[pointIndex - 1] ?? 0) * lockScale
        const currX = width - (extents[pointIndex] ?? 0) * lockScale
        shape.quadraticCurveTo(prevX, prevY, (prevX + currX) * 0.5, midY)
      }
      shape.lineTo(width, height)
    }
    shape.closePath()

    const gradient = context.createLinearGradient(
      edge === 2 ? 0 : width,
      0,
      edge === 2 ? depth : width - depth,
      0
    )
    gradient.addColorStop(0, `rgba(255, 255, 250, ${alpha})`)
    gradient.addColorStop(0.35, `rgba(255, 190, 108, ${alpha * 0.82})`)
    gradient.addColorStop(1, "rgba(255, 86, 24, 0)")
    context.fillStyle = gradient
    context.fill(shape)
  } else if (edge === 0) {
    const gradient = context.createLinearGradient(0, 0, 0, depth)
    gradient.addColorStop(0, `rgba(255, 255, 250, ${alpha})`)
    gradient.addColorStop(0.28, `rgba(255, 190, 108, ${alpha * 0.82})`)
    gradient.addColorStop(1, "rgba(255, 86, 24, 0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, width, depth)
  } else if (edge === 1) {
    const gradient = context.createLinearGradient(0, height, 0, height - depth)
    gradient.addColorStop(0, `rgba(255, 255, 250, ${alpha})`)
    gradient.addColorStop(0.28, `rgba(255, 190, 108, ${alpha * 0.82})`)
    gradient.addColorStop(1, "rgba(255, 86, 24, 0)")
    context.fillStyle = gradient
    context.fillRect(0, height - depth, width, depth)
  } else if (edge === 2) {
    const gradient = context.createLinearGradient(0, 0, depth, 0)
    gradient.addColorStop(0, `rgba(255, 255, 250, ${alpha})`)
    gradient.addColorStop(0.28, `rgba(255, 190, 108, ${alpha * 0.82})`)
    gradient.addColorStop(1, "rgba(255, 86, 24, 0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, depth, height)
  } else {
    const gradient = context.createLinearGradient(width, 0, width - depth, 0)
    gradient.addColorStop(0, `rgba(255, 255, 250, ${alpha})`)
    gradient.addColorStop(0.28, `rgba(255, 190, 108, ${alpha * 0.82})`)
    gradient.addColorStop(1, "rgba(255, 86, 24, 0)")
    context.fillStyle = gradient
    context.fillRect(width - depth, 0, depth, height)
  }

  context.restore()
}

function drawEdgeLightBurns(
  context: Capture2DContext,
  width: number,
  height: number,
  seed: number
): void {
  const random = createSeededRandom(seed ^ 0x6a09e667)
  const shouldRenderBurn = random() < 0.9
  if (!shouldRenderBurn) return

  // Use non-seeded side pick so consecutive photos do not feel biased to one side.
  const edge = Math.random() < 0.5 ? 2 : 3 // vertical sides only: left or right
  const isThinBurn = random() < 0.8
  const depthRatio = isThinBurn
    ? randomBetween(random, 0.016, 0.055)
    : randomBetween(random, 0.08, 0.17)
  const glowAlpha = isThinBurn
    ? randomBetween(random, 0.8, 1)
    : randomBetween(random, 0.5, 0.74)
  const edgeLockAlpha = isThinBurn
    ? randomBetween(random, 0.82, 1)
    : randomBetween(random, 0.56, 0.74)
  const edgeLockDepthRatio = isThinBurn
    ? randomBetween(random, 0.01, 0.03)
    : randomBetween(random, 0.04, 0.08)
  const depth = width * depthRatio
  const jitterScale = isThinBurn
    ? Math.max(6, depth * 0.7)
    : Math.max(10, depth * 0.5)
  const waveA = randomBetween(random, 0.8, 1.9)
  const waveB = randomBetween(random, 2.3, 5.4)
  const waveC = randomBetween(random, 4.8, 9.2)
  const wavePhase = randomBetween(random, 0, Math.PI * 2)
  const waveOffset = randomBetween(random, -depth * 0.2, depth * 0.22)
  const pointCount = isThinBurn ? 34 : 44
  const yStep = height / (pointCount - 1)
  const extents: number[] = []

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    const y = pointIndex * yStep
    const normalizedY = y / Math.max(1, height - 1)
    const wave1 = Math.sin((normalizedY * Math.PI * 2 * waveA) + wavePhase) * jitterScale
    const wave2 = Math.sin((normalizedY * Math.PI * 2 * waveB) + wavePhase * 0.63) * jitterScale * 0.45
    const wave3 = Math.sin((normalizedY * Math.PI * 2 * waveC) + wavePhase * 1.41) * jitterScale * 0.24
    const chaos = (random() - 0.5) * jitterScale * 1.05
    const trendBend = Math.sin((normalizedY * Math.PI) + wavePhase * 0.2) * jitterScale * 0.18
    const burnExtent = Math.max(
      3,
      depth + wave1 + wave2 + wave3 + chaos + waveOffset + trendBend
    )
    extents.push(burnExtent)
  }

  const buildBurnShape = (scale: number): Path2D => {
    const shape = new Path2D()
    if (edge === 2) {
      shape.moveTo(0, 0)
      shape.lineTo((extents[0] ?? 0) * scale, 0)
      for (let pointIndex = 1; pointIndex < pointCount; pointIndex += 1) {
        const prevY = (pointIndex - 1) * yStep
        const currY = pointIndex * yStep
        const midY = (prevY + currY) * 0.5
        const prevExtent = (extents[pointIndex - 1] ?? 0) * scale
        const currExtent = (extents[pointIndex] ?? 0) * scale
        shape.quadraticCurveTo(
          prevExtent,
          prevY,
          (prevExtent + currExtent) * 0.5,
          midY
        )
      }
      shape.quadraticCurveTo(
        (extents[pointCount - 2] ?? (extents[pointCount - 1] ?? 0)) * scale,
        (pointCount - 2) * yStep,
        (extents[pointCount - 1] ?? 0) * scale,
        height
      )
      shape.lineTo(0, height)
    } else {
      shape.moveTo(width, 0)
      shape.lineTo(width - (extents[0] ?? 0) * scale, 0)
      for (let pointIndex = 1; pointIndex < pointCount; pointIndex += 1) {
        const prevY = (pointIndex - 1) * yStep
        const currY = pointIndex * yStep
        const midY = (prevY + currY) * 0.5
        const prevX = width - (extents[pointIndex - 1] ?? 0) * scale
        const currX = width - (extents[pointIndex] ?? 0) * scale
        shape.quadraticCurveTo(
          prevX,
          prevY,
          (prevX + currX) * 0.5,
          midY
        )
      }
      shape.quadraticCurveTo(
        width - (extents[pointCount - 2] ?? (extents[pointCount - 1] ?? 0)) * scale,
        (pointCount - 2) * yStep,
        width - (extents[pointCount - 1] ?? 0) * scale,
        height
      )
      shape.lineTo(width, height)
    }
    shape.closePath()
    return shape
  }

  context.save()
  context.globalCompositeOperation = "color-dodge"

  const burnShape = buildBurnShape(1)
  const glowLayers = [
    { scale: 0.12, color: "rgba(255, 255, 252, 1)", blurMin: 0.6, blurMax: 1.2 },
    { scale: 0.44, color: `rgba(255, 182, 92, ${glowAlpha * 0.82})`, blurMin: 28, blurMax: 52 },
    { scale: 0.62, color: `rgba(255, 112, 38, ${glowAlpha * 0.86})`, blurMin: 42, blurMax: 78 },
    { scale: 0.82, color: `rgba(255, 64, 20, ${glowAlpha * 0.9})`, blurMin: 104, blurMax: 178 },
    { scale: 1, color: `rgba(232, 34, 14, ${glowAlpha * 0.94})`, blurMin: 132, blurMax: 230 },
  ]
  const bigStreakBlurBoost = mix(
    0,
    120,
    clamp01((depthRatio - 0.07) / 0.1)
  )
  glowLayers.forEach((layer, layerIndex) => {
    let layerBlur = randomBetween(random, layer.blurMin, layer.blurMax)
    if (layerIndex > 0) layerBlur += bigStreakBlurBoost
    context.save()
    context.filter = `blur(${layerBlur.toFixed(2)}px)`
    context.fillStyle = layer.color
    context.fill(buildBurnShape(layer.scale))
    context.restore()
  })

  // Extra diffusion cloud to bury any remaining outer contour edges.
  const extremeCloudPasses = 2
  for (let cloudIndex = 0; cloudIndex < extremeCloudPasses; cloudIndex += 1) {
    const cloudScale = randomBetween(random, 0.72, 1)
    const cloudBlur = randomBetween(random, 170, 290) + bigStreakBlurBoost * 0.7
    context.save()
    context.filter = `blur(${cloudBlur.toFixed(2)}px)`
    context.globalAlpha = randomBetween(random, 0.12, 0.24)
    context.fillStyle = `rgba(255, 52, 18, ${glowAlpha})`
    context.fill(buildBurnShape(cloudScale))
    context.restore()
  }

  // Variable softness pass: smoothly mix softer and softer bands without hard edges.
  const softnessBandCount = isThinBurn ? 10 : 14
  for (let bandIndex = 0; bandIndex < softnessBandCount; bandIndex += 1) {
    const y0 = (height / softnessBandCount) * bandIndex
    const y1 = (height / softnessBandCount) * (bandIndex + 1)
    const mid = (y0 + y1) * 0.5
    const softnessSeed = Math.sin((mid / Math.max(1, height)) * Math.PI * 2.3 + wavePhase * 0.77)
    const softnessNoise = (softnessSeed + 1) * 0.5
    const softness = isThinBurn
      ? mix(0.08, 0.5, softnessNoise)
      : mix(0.45, 0.9, softnessNoise)

    context.save()
    context.beginPath()
    context.rect(0, y0, width, y1 - y0)
    context.clip()
    context.filter = `blur(${mix(54, 170, softness).toFixed(2)}px)`
    context.globalAlpha = mix(0.08, 0.2, softness)
    context.fillStyle = `rgba(255, 78, 28, ${glowAlpha})`
    context.fill(burnShape)
    context.restore()
  }

  const coreDepth = depth * randomBetween(random, isThinBurn ? 0.2 : 0.4, isThinBurn ? 0.85 : 0.74)
  const coreStart = isThinBurn ? 0.78 : 0.58
  const thinCoreDepthCap = Math.max(3, width * randomBetween(random, 0.004, 0.009))
  const enforcedCoreDepth = Math.min(coreDepth, thinCoreDepthCap)
  const coreBand = context.createLinearGradient(
    edge === 2 ? 0 : width,
    0,
    edge === 2 ? enforcedCoreDepth : width - enforcedCoreDepth,
    0
  )
  coreBand.addColorStop(0, "rgba(255, 255, 255, 1)")
  coreBand.addColorStop(coreStart, "rgba(255, 236, 205, 0.92)")
  coreBand.addColorStop(1, "rgba(255, 180, 110, 0)")
  context.save()
  context.filter = "blur(0.9px)"
  context.fillStyle = coreBand
  context.globalAlpha = 1
  context.fill(buildBurnShape(0.08))
  context.restore()
  context.globalAlpha = 1

  context.restore()

  const edgeLockDepth = isThinBurn
    ? Math.max(14, Math.round(width * edgeLockDepthRatio))
    : Math.max(16, Math.round(width * edgeLockDepthRatio))
  drawEdgeContactBurn(
    context,
    width,
    height,
    edge,
    edgeLockAlpha,
    edgeLockDepth,
    extents
  )
}

function applyDisposableFilmEffect(
  context: Capture2DContext,
  width: number,
  height: number
): void {
  const profile = createDisposableFilmProfile()
  const sourceCanvas = context.canvas

  if (profile.blurPx > 0) {
    const blurCanvas = createCanvas(width, height)
    const blurContext = get2DContext(blurCanvas)
    blurContext.filter = `blur(${profile.blurPx.toFixed(2)}px)`
    blurContext.drawImage(sourceCanvas, 0, 0, width, height)

    context.save()
    context.globalAlpha = profile.blurMix
    context.drawImage(blurCanvas, 0, 0, width, height)
    context.restore()
  }

  // Light burns temporarily disabled.
  // drawEdgeLightBurns(context, width, height, profile.seed)

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

export async function captureImageFastFromVideo(
  session: VideoCaptureSession
): Promise<Blob> {
  const { video, track, trackId, captureWidth, captureHeight, hasTorch } =
    session
  if (track.id !== trackId) {
    throw new Error("Camera track changed. Please try again.")
  }

  const flashDurationMs = Math.round(randomBetween(Math.random, 600, 800))
  const jpegQuality = 1

  let torchEnabled = false

  try {
    const { canvas, context } = getReusableCaptureSurface(
      captureWidth,
      captureHeight
    )
    context.clearRect(0, 0, captureWidth, captureHeight)

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

    return await convertCanvasToJpegBlob(canvas, jpegQuality)
  } finally {
    if (hasTorch && torchEnabled) {
      await track.applyConstraints({ advanced: [{ torch: false } as never] })
    }
  }
}

export function createVideoCaptureSession(
  video: HTMLVideoElement,
  track: MediaStreamTrack
): VideoCaptureSession {
  const settings = track.getSettings()
  const sourceWidth = video.videoWidth || settings.width || 0
  const sourceHeight = video.videoHeight || settings.height || 0

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Camera preview is not ready")
  }

  const { width: captureWidth, height: captureHeight } = getCaptureDimensions(
    sourceWidth,
    sourceHeight
  )

  return {
    video,
    track,
    trackId: track.id,
    captureWidth,
    captureHeight,
    hasTorch: getOrProbeTorchSupport(track),
  }
}

export async function applyDisposableFilmEffectToBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const context = get2DContext(canvas)

  try {
    context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height)
    applyDisposableFilmEffect(context, bitmap.width, bitmap.height)
    return await convertCanvasToJpegBlob(canvas, 0.86)
  } finally {
    bitmap.close()
  }
}
