"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon } from "@hugeicons/core-free-icons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateEvent } from "@/features/events/services/events-util"
import { CreateEventInput, Event } from "@/features/events/types/event-types"
import {
  DEFAULT_MAX_ATTENDEES,
  DEFAULT_MAX_PHOTO_LIMIT,
} from "../constants/event-constants"
import { useMutation, useQueryClient } from "@tanstack/react-query"

type FormErrors = Partial<Record<keyof CreateEventInput, string>>

function validate(form: CreateEventInput): FormErrors {
  const errors: FormErrors = {}
  if (!form.eventName.trim()) errors.eventName = "Event name is required."
  if (!form.eventStart) errors.eventStart = "Event date is required."
  if (!form.password) errors.password = "Password is required."
  if (!form.attendeeLimit || form.attendeeLimit <= 0) {
    errors.attendeeLimit = "Must be at least 1."
  } else if (form.attendeeLimit > DEFAULT_MAX_ATTENDEES) {
    errors.attendeeLimit = `Cannot exceed ${DEFAULT_MAX_ATTENDEES}.`
  }
  if (!form.photoLimit || form.photoLimit <= 0) {
    errors.photoLimit = "Must be at least 1."
  } else if (form.photoLimit > DEFAULT_MAX_PHOTO_LIMIT) {
    errors.photoLimit = `Cannot exceed ${DEFAULT_MAX_PHOTO_LIMIT}.`
  }
  return errors
}

export function EditEventDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateEventInput>({
    eventName: event.eventName,
    eventStart: event.eventStart,
    attendeeLimit: event.attendeeLimit,
    photoLimit: event.photoLimit,
    password: event.password ?? "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreateEventInput) => updateEvent(event.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      setOpen(false)
      setErrors({})
    },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const parsed =
      name === "attendeeLimit" || name === "photoLimit" ? Number(value) : value
    const updated = { ...form, [name]: parsed }
    setForm(updated)
    const fieldErrors = validate(updated)
    setErrors((prev) => ({
      ...prev,
      [name]: fieldErrors[name as keyof CreateEventInput],
    }))
  }

  function handleSubmit() {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Event Name</Label>
            <Input
              name="eventName"
              value={form.eventName}
              onChange={handleChange}
            />
            {errors.eventName && (
              <p className="text-sm text-destructive">{errors.eventName}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Event Date</Label>
            <Input
              name="eventStart"
              type="date"
              value={form.eventStart}
              onChange={handleChange}
            />
            {errors.eventStart && (
              <p className="text-sm text-destructive">{errors.eventStart}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Max Attendees</Label>
            <Input
              name="attendeeLimit"
              type="number"
              value={form.attendeeLimit}
              onChange={handleChange}
              min={1}
              max={DEFAULT_MAX_ATTENDEES}
            />
            {errors.attendeeLimit && (
              <p className="text-sm text-destructive">{errors.attendeeLimit}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Photo Limit</Label>
            <Input
              name="photoLimit"
              type="number"
              value={form.photoLimit}
              onChange={handleChange}
              min={1}
              max={DEFAULT_MAX_PHOTO_LIMIT}
            />
            {errors.photoLimit && (
              <p className="text-sm text-destructive">{errors.photoLimit}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Event Password</Label>
            <Input
              name="password"
              value={form.password}
              onChange={handleChange}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
