"use client"

import { ChangeEvent, useState } from "react"
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
import { updateEvent } from "@/features/events/client/api"
import { eventQueryKeys } from "@/features/events/client/query-keys"
import { CreateEventInput, Event } from "@/features/events/types/event-types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getEventStatus } from "@/features/events/utils/event-status"
import {
  EventForm,
  FormErrors,
  validateEventForm,
  validateEventNameOnly,
} from "@/features/events/components/event-form"

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return Number.isNaN(localDate.getTime())
    ? ""
    : localDate.toISOString().slice(0, 16)
}

export function EditEventDialog({ event }: { event: Event }) {
  const normalizedEventStart = toDateTimeLocalValue(event.eventStart)
  const normalizedEventEnd = toDateTimeLocalValue(event.eventEnd)
  const eventStatus = getEventStatus(event.eventStart, event.eventEnd)
  const isOnlyNameEditable =
    eventStatus === "Ongoing" || eventStatus === "Ended"

  const initialForm: CreateEventInput = {
    eventName: event.eventName,
    eventStart: normalizedEventStart,
    eventEnd: normalizedEventEnd,
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
    mutationFn: (input: Partial<CreateEventInput>) =>
      updateEvent(event.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all })
      setOpen(false)
      setErrors({})
    },
  })

  function isDirty(form: CreateEventInput) {
    return (
      form.eventName !== initialForm.eventName ||
      form.eventStart !== initialForm.eventStart ||
      form.eventEnd !== initialForm.eventEnd ||
      form.attendeeLimit !== initialForm.attendeeLimit ||
      form.photoLimit !== initialForm.photoLimit ||
      form.password !== initialForm.password
    )
  }

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
    const payload: Partial<CreateEventInput> = isOnlyNameEditable
      ? { eventName: form.eventName }
      : form

    const validationErrors = isOnlyNameEditable
      ? validateEventNameOnly({ eventName: form.eventName })
      : validateEventForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    mutation.mutate(payload)
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
          <EventForm
            form={form}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            isSubmitting={mutation.isPending}
            submitLabel="Save changes"
            submittingLabel="Saving..."
            disableFields={{
              eventStart: isOnlyNameEditable,
              eventEnd: isOnlyNameEditable,
              attendeeLimit: isOnlyNameEditable,
              photoLimit: isOnlyNameEditable,
              password: isOnlyNameEditable,
            }}
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
