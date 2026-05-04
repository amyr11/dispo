"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockPasswordIcon, UserCircleIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EventPageHeader } from "@/features/events/components/event-page-header"
import {
  attendeeFingerprintKey,
  attendeeNicknameKey,
  getOrCreatePublicAttendeeFingerprint,
  getStoredPublicAttendeeValue,
  setStoredPublicAttendeeValue,
} from "@/features/events/utils/public-attendee-storage"

type PublicEventPasswordFormProps = {
  eventId: number
  eventName: string
  eventStart: string
  eventEnd: string
}

type JoinStep = "password" | "nickname"

type JoinResponse = {
  attendee: {
    nickname: string
    fingerprint: string
  }
}

export function PublicEventPasswordForm({
  eventId,
  eventName,
  eventStart,
  eventEnd,
}: PublicEventPasswordFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<JoinStep>("password")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState(() =>
    getStoredPublicAttendeeValue(attendeeNicknameKey(eventId))
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

      const fingerprint = getOrCreatePublicAttendeeFingerprint(eventId)
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
      setStoredPublicAttendeeValue(
        attendeeFingerprintKey(eventId),
        body.attendee.fingerprint
      )
      setStoredPublicAttendeeValue(
        attendeeNicknameKey(eventId),
        body.attendee.nickname
      )
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
      <EventPageHeader
        eventStart={eventStart}
        eventEnd={eventEnd}
        eventName={eventName}
      />

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
