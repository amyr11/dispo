"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { LockPasswordIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EventPageHeader } from "@/features/events/components/event-page-header"

type PublicGalleryPasswordFormProps = {
  eventId: number
  eventName: string
  eventStart: string
}

export function PublicGalleryPasswordForm({
  eventId,
  eventName,
  eventStart,
}: PublicGalleryPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/events/${eventId}/gallery/verify`, {
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
          .catch(() => ({ error: "Unable to unlock gallery" }))
        throw new Error(body.error ?? "Unable to unlock gallery")
      }

      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to unlock gallery"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
      <EventPageHeader eventStart={eventStart} eventName={eventName} />

      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-2">
          <HugeiconsIcon icon={LockPasswordIcon} className="size-8 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-medium">Unlock gallery</h1>
            <p className="text-sm text-muted-foreground">
              Enter the event password to view photos.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="gallery-password">Password</Label>
          <Input
            id="gallery-password"
            type="password"
            value={password}
            onChange={(inputEvent) => setPassword(inputEvent.target.value)}
            autoComplete="current-password"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting || !password.trim()}>
          {isSubmitting ? "Unlocking..." : "Unlock gallery"}
        </Button>
      </div>
    </form>
  )
}
