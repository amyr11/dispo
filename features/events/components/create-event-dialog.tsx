"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Add } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
import { createEvent } from "@/features/events/services/events-util"
import { CreateEventInput } from "@/features/events/types/event-types"
import {
  DEFAULT_MAX_ATTENDEES,
  DEFAULT_MAX_PHOTO_LIMIT,
} from "../constants/event-constants"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const EMPTY_FORM: CreateEventInput = {
  eventName: "",
  eventStart: "",
  attendeeLimit: DEFAULT_MAX_ATTENDEES,
  photoLimit: DEFAULT_MAX_PHOTO_LIMIT,
  password: "",
}

type FormErrors = Partial<Record<keyof CreateEventInput, string>>

function isDirty(form: CreateEventInput) {
  return (
    form.eventName !== "" ||
    form.eventStart !== "" ||
    form.attendeeLimit !== DEFAULT_MAX_ATTENDEES ||
    form.photoLimit !== DEFAULT_MAX_PHOTO_LIMIT ||
    form.password !== ""
  )
}

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

export function CreateEventDialog() {
  const [open, setOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [form, setForm] = useState<CreateEventInput>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      setOpen(false)
      setForm(EMPTY_FORM)
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

  function handleOpenChange(next: boolean) {
    if (!next && isDirty(form)) {
      setConfirmClose(true)
    } else {
      setOpen(next)
      if (!next) {
        setForm(EMPTY_FORM)
        setErrors({})
      }
    }
  }

  function handleConfirmClose() {
    setConfirmClose(false)
    setOpen(false)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button onClick={() => setOpen(true)}>
            <HugeiconsIcon icon={Add} size={16} /> Create event
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
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
              <Label>Event password</Label>
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
              {mutation.isPending ? "Creating..." : "Create"}
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
            <AlertDialogCancel>No, I&apos;ll keep editing</AlertDialogCancel>
            <AlertDialogDesctructiveAction onClick={handleConfirmClose}>
              Yes, discard them
            </AlertDialogDesctructiveAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
