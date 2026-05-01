"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockPasswordIcon } from "@hugeicons/core-free-icons"
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

export function PublicEventPasswordForm({
  eventId,
  eventName,
  eventStart,
}: PublicEventPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
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

      <div className="flex w-full max-w-xs flex-col gap-4">
        <div className="flex flex-col gap-2">
          <HugeiconsIcon
            icon={LockPasswordIcon}
            className="size-8 text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-medium">
              Event password
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the password to open this event.
            </p>
          </div>
        </div>
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
      </div>
    </form>
  )
}
