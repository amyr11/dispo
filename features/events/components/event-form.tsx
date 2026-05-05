import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateEventInput } from "@/features/events/types/event-types"
import { ChangeEvent } from "react"
import {
  DEFAULT_MAX_ATTENDEES,
  DEFAULT_MAX_PHOTO_LIMIT,
} from "../constants/event-constants"
import {
  getCurrentLocalDateTimeValue,
  isPastLocalDateTime,
} from "@/lib/utils/date-utils"

type FormErrors = Partial<Record<keyof CreateEventInput, string>>

export function validateEventForm(form: CreateEventInput): FormErrors {
  const errors: FormErrors = {}

  if (!form.eventName.trim()) errors.eventName = "Event name is required."
  if (!form.eventStart) errors.eventStart = "Event start date/time is required."
  if (!form.eventEnd) errors.eventEnd = "Event end date/time is required."
  if (!form.password) errors.password = "Password is required."

  if (form.eventStart && isPastLocalDateTime(form.eventStart)) {
    errors.eventStart = "Event start cannot be in the past."
  }
  if (form.eventEnd && isPastLocalDateTime(form.eventEnd)) {
    errors.eventEnd = "Event end cannot be in the past."
  }

  if (form.eventStart && form.eventEnd) {
    const start = new Date(form.eventStart)
    const end = new Date(form.eventEnd)
    if (end <= start) {
      errors.eventEnd = "Event end must be after event start."
    }
  }

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

export function validateEventNameOnly(
  form: Pick<CreateEventInput, "eventName">
): FormErrors {
  const errors: FormErrors = {}
  if (!form.eventName.trim()) errors.eventName = "Event name is required."
  return errors
}

function getRevealDateTimeLocalValue(eventEnd: string): string {
  if (!eventEnd) return ""
  const eventEndDate = new Date(eventEnd)
  if (Number.isNaN(eventEndDate.getTime())) return ""

  const revealDate = new Date(eventEndDate.getTime() + 12 * 60 * 60 * 1000)
  if (Number.isNaN(revealDate.getTime())) return ""

  const localDate = new Date(
    revealDate.getTime() - revealDate.getTimezoneOffset() * 60_000
  )
  return localDate.toISOString().slice(0, 16)
}

type EventFormProps = {
  form: CreateEventInput
  errors: FormErrors
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  isSubmitting: boolean
  submitLabel: string
  submittingLabel: string
  disableFields?: Partial<Record<keyof CreateEventInput, boolean>>
}

export function EventForm({
  form,
  errors,
  onChange,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  disableFields,
}: EventFormProps) {
  const nowLocalDateTime = getCurrentLocalDateTimeValue()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>Event Name</Label>
        <Input
          name="eventName"
          value={form.eventName}
          onChange={onChange}
          disabled={disableFields?.eventName}
        />
        {errors.eventName && (
          <p className="text-sm text-destructive">{errors.eventName}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label>Event Start</Label>
        <Input
          name="eventStart"
          type="datetime-local"
          value={form.eventStart}
          onChange={onChange}
          min={nowLocalDateTime}
          disabled={disableFields?.eventStart}
        />
        {errors.eventStart && (
          <p className="text-sm text-destructive">{errors.eventStart}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label>Event End</Label>
        <Input
          name="eventEnd"
          type="datetime-local"
          value={form.eventEnd}
          onChange={onChange}
          min={form.eventStart || nowLocalDateTime}
          disabled={disableFields?.eventEnd}
        />
        {errors.eventEnd && (
          <p className="text-sm text-destructive">{errors.eventEnd}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label>Reveal Date</Label>
        <Input
          type="datetime-local"
          value={getRevealDateTimeLocalValue(form.eventEnd)}
          disabled
        />
        <p className="text-xs text-muted-foreground">12 hours after event end.</p>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Max Attendees</Label>
        <Input
          name="attendeeLimit"
          type="number"
          value={form.attendeeLimit}
          onChange={onChange}
          min={1}
          max={DEFAULT_MAX_ATTENDEES}
          disabled={disableFields?.attendeeLimit}
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
          onChange={onChange}
          min={1}
          max={DEFAULT_MAX_PHOTO_LIMIT}
          disabled={disableFields?.photoLimit}
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
          onChange={onChange}
          disabled={disableFields?.password}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  )
}

export type { FormErrors }
