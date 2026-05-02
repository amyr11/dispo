"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockPasswordIcon, UserCircleIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import EventBadge from "@/features/events/components/event-badge"
import { formatDate } from "@/lib/utils/date-utils"

type PublicEventPasswordFormProps = {
  eventId: number
  eventName: string
  eventStart: string
}

type JoinStep = "password" | "nickname"

type JoinResponse = {
  attendee: {
    nickname: string
    fingerprint: string
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function attendeeFingerprintKey(eventId: number): string {
  return `dispo_public_event_${eventId}_fingerprint`
}

function attendeeNicknameKey(eventId: number): string {
  return `dispo_public_event_${eventId}_nickname`
}

function getStoredValue(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

function setStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // localStorage can be unavailable in private browsing; the cookie still keeps access.
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

function getOrCreateFingerprint(eventId: number): string {
  const key = attendeeFingerprintKey(eventId)
  const storedFingerprint = getStoredValue(key)

  if (UUID_PATTERN.test(storedFingerprint)) {
    return storedFingerprint.toLowerCase()
  }

  const fingerprint = createFingerprint()
  setStoredValue(key, fingerprint)
  return fingerprint
}

export function PublicEventPasswordForm({
  eventId,
  eventName,
  eventStart,
}: PublicEventPasswordFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<JoinStep>("password")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState(() =>
    getStoredValue(attendeeNicknameKey(eventId))
  )
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      if (step === "password") {
        const response = await fetch(`/api/events/${eventId}/public/verify`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        })

        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => ({ error: "Unable to unlock event" }))
          throw new Error(body.error ?? "Unable to unlock event")
        }

        setStep("nickname")
        return
      }

      const fingerprint = getOrCreateFingerprint(eventId)
      const response = await fetch(`/api/events/${eventId}/public/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          nickname,
          fingerprint,
        }),
      })

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Unable to join event" }))
        throw new Error(body.error ?? "Unable to join event")
      }

      const body = (await response.json()) as JoinResponse
      setStoredValue(attendeeFingerprintKey(eventId), body.attendee.fingerprint)
      setStoredValue(attendeeNicknameKey(eventId), body.attendee.nickname)
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to unlock event"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-2 border-b pb-8">
        <EventBadge eventStart={eventStart} />
        <p className="font-heading text-2xl font-semibold">{eventName}</p>
        <p className="text-sm">{formatDate(eventStart)}</p>
      </header>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-2">
          <HugeiconsIcon
            icon={step === "password" ? LockPasswordIcon : UserCircleIcon}
            className="size-8 text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-medium">
              {step === "password"
                ? "Join the fun and memories! ✨"
                : "Pick your nickname"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === "password"
                ? "Enter the password for this event."
                : "This is how you will be remembered here."}
            </p>
          </div>
        </div>
        {step === "password" ? (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="event-password">Password</Label>
              <Input
                id="event-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting || !password.trim()}>
              {isSubmitting ? "Unlocking..." : "Unlock event"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="event-nickname">Nickname</Label>
              <Input
                id="event-nickname"
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                autoComplete="nickname"
                maxLength={32}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !nickname.trim()}
              >
                {isSubmitting ? "Joining..." : "Join event"}
              </Button>
            </div>
          </>
        )}
      </div>
    </form>
  )
}
