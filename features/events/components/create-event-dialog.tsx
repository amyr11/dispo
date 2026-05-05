"use client"

import { ChangeEvent, useState } from "react"
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
import { createEvent } from "@/features/events/client/api"
import { eventQueryKeys } from "@/features/events/client/query-keys"
import { CreateEventInput } from "@/features/events/types/event-types"
import {
  DEFAULT_MAX_ATTENDEES,
  DEFAULT_MAX_PHOTO_LIMIT,
} from "../constants/event-constants"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  EventForm,
  FormErrors,
  validateEventForm,
} from "@/features/events/components/event-form"

const EMPTY_FORM: CreateEventInput = {
  eventName: "",
  eventStart: "",
  eventEnd: "",
  attendeeLimit: DEFAULT_MAX_ATTENDEES,
  photoLimit: DEFAULT_MAX_PHOTO_LIMIT,
  password: "",
}

function isDirty(form: CreateEventInput) {
  return (
    form.eventName !== "" ||
    form.eventStart !== "" ||
    form.eventEnd !== "" ||
    form.attendeeLimit !== DEFAULT_MAX_ATTENDEES ||
    form.photoLimit !== DEFAULT_MAX_PHOTO_LIMIT ||
    form.password !== ""
  )
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
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all })
      setOpen(false)
      setForm(EMPTY_FORM)
      setErrors({})
    },
  })

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const parsed =
      name === "attendeeLimit" || name === "photoLimit" ? Number(value) : value

    const updated = { ...form, [name]: parsed }
    setForm(updated)

    const fieldErrors = validateEventForm(updated)
    setErrors((prev) => ({
      ...prev,
      [name]: fieldErrors[name as keyof CreateEventInput],
    }))
  }

  function handleSubmit() {
    const validationErrors = validateEventForm(form)
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
          <EventForm
            form={form}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            isSubmitting={mutation.isPending}
            submitLabel="Create"
            submittingLabel="Creating..."
          />
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
