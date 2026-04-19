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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createEvent } from "@/features/events/services/events-util"
import { Event } from "@/features/events/types/event-types"
import {
  DEFAULT_MAX_ATTENDEES,
  DEFAULT_MAX_PHOTO_LIMIT,
} from "../constants/event-constants"

const EMPTY_FORM: Event = {
  eventName: "",
  eventDate: "",
  maxAttendees: DEFAULT_MAX_ATTENDEES,
  photoLimit: DEFAULT_MAX_PHOTO_LIMIT,
}

type FormErrors = Partial<Record<keyof Event, string>>

function isDirty(form: Event) {
  return (
    form.eventName !== "" ||
    form.eventDate !== "" ||
    form.maxAttendees !== DEFAULT_MAX_ATTENDEES ||
    form.photoLimit !== DEFAULT_MAX_PHOTO_LIMIT
  )
}

function validate(form: Event): FormErrors {
  const errors: FormErrors = {}

  if (!form.eventName.trim()) {
    errors.eventName = "Event name is required."
  }

  if (!form.eventDate) {
    errors.eventDate = "Event date is required."
  }

  if (!form.maxAttendees || form.maxAttendees <= 0) {
    errors.maxAttendees = "Must be at least 1."
  } else if (form.maxAttendees > DEFAULT_MAX_ATTENDEES) {
    errors.maxAttendees = `Cannot exceed ${DEFAULT_MAX_ATTENDEES}.`
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
  const [form, setForm] = useState<Event>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const parsed =
      name === "maxAttendees" || name === "photoLimit" ? Number(value) : value

    const updated = { ...form, [name]: parsed }
    setForm(updated)

    // Validate only the changed field immediately
    const fieldErrors = validate(updated)
    setErrors((prev) => ({
      ...prev,
      [name]: fieldErrors[name as keyof Event],
    }))
  }

  function handleSubmit() {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    createEvent(form)
    setOpen(false)
    setForm(EMPTY_FORM)
    setErrors({})
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
                name="eventDate"
                type="date"
                value={form.eventDate}
                onChange={handleChange}
              />
              {errors.eventDate && (
                <p className="text-sm text-destructive">{errors.eventDate}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label>Max Attendees</Label>
              <Input
                name="maxAttendees"
                type="number"
                value={form.maxAttendees}
                onChange={handleChange}
                min={1}
                max={DEFAULT_MAX_ATTENDEES}
              />
              {errors.maxAttendees && (
                <p className="text-sm text-destructive">
                  {errors.maxAttendees}
                </p>
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

            <Button onClick={handleSubmit}>Create</Button>
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
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
