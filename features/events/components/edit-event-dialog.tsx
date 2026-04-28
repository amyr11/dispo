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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogDesctructiveAction,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateEvent } from "@/features/events/client/api"
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
  const normalizedEventStart = event.eventStart.slice(0, 10)

  const initialForm: CreateEventInput = {
    eventName: event.eventName,
    eventStart: normalizedEventStart,
    attendeeLimit: event.attendeeLimit,
    photoLimit: event.photoLimit,
    password: event.password ?? "",
  }

  const [open, setOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [form, setForm] = useState<CreateEventInput>(initialForm)
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

  function isDirty(form: CreateEventInput) {
    return (
      form.eventName !== initialForm.eventName ||
      form.eventStart !== initialForm.eventStart ||
      form.attendeeLimit !== initialForm.attendeeLimit ||
      form.photoLimit !== initialForm.photoLimit ||
      form.password !== initialForm.password
    )
  }

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

  function handleOpenChange(next: boolean) {
    if (!next && isDirty(form)) {
      setConfirmClose(true)
    } else {
      setOpen(next)
      if (!next) {
        setForm(initialForm)
        setErrors({})
      }
    }
  }

  function handleConfirmClose() {
    setConfirmClose(false)
    setOpen(false)
    setForm(initialForm)
    setErrors({})
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                defaultValue={form.attendeeLimit}
                onChange={handleChange}
                min={1}
                max={DEFAULT_MAX_ATTENDEES}
              />
              {errors.attendeeLimit && (
                <p className="text-sm text-destructive">
                  {errors.attendeeLimit}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label>Photo Limit</Label>
              <Input
                name="photoLimit"
                type="number"
                defaultValue={form.photoLimit}
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

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close this
              form?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, i&apos;ll keep editing</AlertDialogCancel>
            <AlertDialogDesctructiveAction onClick={handleConfirmClose}>
              Yes, discard them
            </AlertDialogDesctructiveAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
