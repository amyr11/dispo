const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function attendeeFingerprintKey(eventId: number): string {
  return `dispo_public_event_${eventId}_fingerprint`
}

export function attendeeNicknameKey(eventId: number): string {
  return `dispo_public_event_${eventId}_nickname`
}

export function getStoredPublicAttendeeValue(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

export function setStoredPublicAttendeeValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // localStorage can be unavailable in private browsing.
  }
}

function createFingerprint(): string {
  const browserCrypto = globalThis.crypto

  if (typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID()
  }

  const bytes = browserCrypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-")
}

export function getOrCreatePublicAttendeeFingerprint(eventId: number): string {
  const key = attendeeFingerprintKey(eventId)
  const storedFingerprint = getStoredPublicAttendeeValue(key)

  if (UUID_PATTERN.test(storedFingerprint)) {
    return storedFingerprint.toLowerCase()
  }

  const fingerprint = createFingerprint()
  setStoredPublicAttendeeValue(key, fingerprint)
  return fingerprint
}
