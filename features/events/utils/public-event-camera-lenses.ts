export type LensOption = {
  deviceId: string
  label: string
  supportsFlash: boolean
}

export type CameraVideoPreferences = {
  width?: number
  height?: number
  frameRate?: number
  aspectRatio?: number
}

const FRONT_CAMERA_LABEL_HINTS = ["front", "user", "selfie"]

export function isLikelyFrontCameraLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return FRONT_CAMERA_LABEL_HINTS.some((hint) => normalized.includes(hint))
}

async function lensSupportsFlash(track: MediaStreamTrack): Promise<boolean> {
  return (track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean })
    .torch === true
}

export async function openCameraStreamByDeviceId(
  deviceId: string,
  preferences?: CameraVideoPreferences
): Promise<MediaStream> {
  const baseVideoConstraints = {
    deviceId: { exact: deviceId },
    width: preferences?.width ? { ideal: preferences.width } : undefined,
    height: preferences?.height ? { ideal: preferences.height } : undefined,
    frameRate: preferences?.frameRate
      ? { ideal: preferences.frameRate }
      : undefined,
  }

  if (!preferences?.aspectRatio) {
    return navigator.mediaDevices.getUserMedia({
      video: baseVideoConstraints,
      audio: false,
    })
  }

  return navigator.mediaDevices
    .getUserMedia({
      video: {
        ...baseVideoConstraints,
        aspectRatio: { exact: preferences.aspectRatio },
      },
      audio: false,
    })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({
        video: {
          ...baseVideoConstraints,
          aspectRatio: { ideal: preferences.aspectRatio },
        },
        audio: false,
      })
    )
}

export async function openEnvironmentStream(
  preferences?: CameraVideoPreferences
): Promise<MediaStream> {
  return navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: { exact: "environment" },
        width: preferences?.width ? { ideal: preferences.width } : undefined,
        height: preferences?.height ? { ideal: preferences.height } : undefined,
        aspectRatio: preferences?.aspectRatio
          ? { ideal: preferences.aspectRatio }
          : undefined,
        frameRate: preferences?.frameRate
          ? { ideal: preferences.frameRate }
          : undefined,
      },
      audio: false,
    })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: preferences?.width ? { ideal: preferences.width } : undefined,
          height: preferences?.height ? { ideal: preferences.height } : undefined,
          aspectRatio: preferences?.aspectRatio
            ? { ideal: preferences.aspectRatio }
            : undefined,
          frameRate: preferences?.frameRate
            ? { ideal: preferences.frameRate }
            : undefined,
        },
        audio: false,
      })
    )
}

export async function listLensOptions(): Promise<LensOption[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []

  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoInputs = devices.filter((device) => device.kind === "videoinput")

  return videoInputs
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
      supportsFlash: false,
    }))
}

export async function probeRearLensesWithFlash(
  lenses: LensOption[]
): Promise<LensOption[]> {
  const rearLenses: LensOption[] = []

  for (const lens of lenses) {
    let stream: MediaStream | null = null

    try {
      stream = await openCameraStreamByDeviceId(lens.deviceId)
      const [track] = stream.getVideoTracks()
      if (!track) continue

      const facingMode = track.getSettings?.().facingMode
      const isRearLens =
        facingMode === "environment" ||
        (facingMode !== "user" && !isLikelyFrontCameraLabel(lens.label))

      if (!isRearLens) continue

      const supportsFlash = await lensSupportsFlash(track)
      rearLenses.push({ ...lens, supportsFlash })
    } catch {
      // Ignore lenses that fail probing.
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }

  return rearLenses
}
