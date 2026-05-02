import { Prisma } from "@prisma/client"
import { eventsRepository } from "@/features/events/server/repository"
import { eventsStorageProvider } from "@/features/events/server/storage-provider"
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/features/events/server/errors"
import {
  CreateEventInput,
  JoinPublicEventInput,
  PublicPhotoCaptureInput,
  UpdateEventInput,
} from "@/features/events/server/types"
import { getEventStatus } from "@/features/events/utils/event-status"

function computeRevealAt(eventStartIso: string): Date {
  const revealAt = new Date(eventStartIso)
  revealAt.setDate(revealAt.getDate() + 1)
  revealAt.setHours(12, 0, 0, 0)
  return revealAt
}

function getUniqueErrorFields(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target
  return Array.isArray(target) ? target.map(String) : []
}

function isUniqueConstraintError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

export const eventsService = {
  listEvents(userId: string) {
    return eventsRepository.findManyByUserId(userId)
  },

  async getEventById(userId: string, eventId: number) {
    const event = await eventsRepository.findOneByIdAndUserId(eventId, userId)
    if (!event) {
      throw new NotFoundError("Event not found")
    }
    return event
  },

  async getPublicEventById(eventId: number) {
    const event = await eventsRepository.findOneById(eventId)
    if (!event) {
      throw new NotFoundError("Event not found")
    }
    return event
  },

  createEvent(userId: string, input: CreateEventInput) {
    return eventsRepository.createForUser(
      userId,
      input,
      computeRevealAt(input.eventStart)
    )
  },

  async updateEvent(userId: string, eventId: number, input: UpdateEventInput) {
    const event = await this.getEventById(userId, eventId)
    const eventStatus = getEventStatus(event.eventStart)
    const isOnlyNameEditable =
      eventStatus === "Ongoing" || eventStatus === "Ended"

    if (isOnlyNameEditable) {
      const hasNonNameEdits =
        input.eventStart !== undefined ||
        input.attendeeLimit !== undefined ||
        input.photoLimit !== undefined ||
        input.password !== undefined

      if (hasNonNameEdits) {
        throw new ValidationError(
          "Only eventName can be edited once the event is ongoing or ended"
        )
      }

      if (input.eventName === undefined) {
        throw new ValidationError("eventName is required")
      }
    }

    const result = await eventsRepository.updateByIdAndUserId(
      eventId,
      userId,
      input,
      input.eventStart ? computeRevealAt(input.eventStart) : undefined
    )

    if (result.count === 0) {
      throw new NotFoundError("Event not found")
    }

    return this.getEventById(userId, eventId)
  },

  async deleteEvent(userId: string, eventId: number) {
    const result = await eventsRepository.deleteByIdAndUserId(eventId, userId)
    if (result.count === 0) {
      throw new NotFoundError("Event not found")
    }

    await eventsStorageProvider.deleteEventFolder(userId, eventId)
  },

  async getEventStats(userId: string, eventId: number) {
    await this.getEventById(userId, eventId)

    const [attendeesCount, shotsCount] = await Promise.all([
      eventsRepository.countAttendeesByEventId(eventId),
      eventsRepository.countPhotosByEventId(eventId),
    ])

    return { attendeesCount, shotsCount }
  },

  async getPublicEventStats(eventId: number) {
    await this.getPublicEventById(eventId)

    const [attendeesCount, shotsCount] = await Promise.all([
      eventsRepository.countAttendeesByEventId(eventId),
      eventsRepository.countPhotosByEventId(eventId),
    ])

    return { attendeesCount, shotsCount }
  },

  async verifyPublicEventPassword(eventId: number, password: string) {
    const event = await this.getPublicEventById(eventId)
    const eventStatus = getEventStatus(event.eventStart)

    if (eventStatus === "Upcoming") {
      throw new UnauthorizedError("This event is not open yet")
    }

    if (eventStatus === "Ended") {
      throw new UnauthorizedError("This event has ended")
    }

    if (event.password !== password) {
      throw new UnauthorizedError("Invalid event password")
    }

    return event
  },

  async joinPublicEvent(eventId: number, input: JoinPublicEventInput) {
    const event = await this.verifyPublicEventPassword(eventId, input.password)
    const existingAttendee =
      await eventsRepository.findAttendeeByEventIdAndFingerprint(
        eventId,
        input.fingerprint
      )

    if (existingAttendee) {
      return { event, attendee: existingAttendee }
    }

    const nicknameOwner =
      await eventsRepository.findAttendeeByEventIdAndNickname(
        eventId,
        input.nickname
      )

    if (nicknameOwner) {
      throw new ConflictError("Nickname is already taken for this event")
    }

    const attendeesCount =
      await eventsRepository.countAttendeesByEventId(eventId)

    if (attendeesCount >= event.attendeeLimit) {
      throw new ConflictError("This event is already full")
    }

    try {
      const attendee = await eventsRepository.createAttendee(eventId, input)
      return { event, attendee }
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error
      }

      const fields = getUniqueErrorFields(error)

      if (fields.includes("fingerprint")) {
        const attendee =
          await eventsRepository.findAttendeeByEventIdAndFingerprint(
            eventId,
            input.fingerprint
          )

        if (attendee) {
          return { event, attendee }
        }
      }

      if (fields.includes("nickname")) {
        throw new ConflictError("Nickname is already taken for this event")
      }

      throw error
    }
  },

  async getPublicAttendeeCaptureState(eventId: number, fingerprint: string) {
    const attendeeState = await eventsRepository.getPublicAttendeeCaptureState(
      eventId,
      fingerprint
    )

    if (!attendeeState) {
      throw new NotFoundError("Attendee not found")
    }

    return attendeeState
  },

  async capturePublicEventPhoto(
    eventId: number,
    input: PublicPhotoCaptureInput & { file: Blob }
  ) {
    const event = await this.getPublicEventById(eventId)
    const eventStatus = getEventStatus(event.eventStart)

    if (eventStatus !== "Ongoing") {
      throw new ConflictError("This event is not accepting photos right now")
    }

    const takenAt = new Date(input.takenAt)
    const storagePath = eventsStorageProvider.buildPublicPhotoStoragePath(
      event.userId,
      eventId,
      takenAt
    )

    try {
      await eventsStorageProvider.uploadPublicPhoto(storagePath, input.file)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("row-level security policy")
      ) {
        throw new ConflictError(
          "Photo upload is blocked by Supabase Storage policy. Allow uploads to photos-bucket or configure a service-role uploader."
        )
      }

      throw error
    }

    try {
      const result =
        await eventsRepository.createPublicAttendeePhotoAndIncrementCounter({
          eventId,
          fingerprint: input.fingerprint,
          takenAt,
          storagePath,
        })

      if (result.status === "not-found") {
        throw new NotFoundError("Attendee not found")
      }

      if (result.status === "limit-reached") {
        throw new ConflictError("You have reached the photo limit for this event")
      }

      return result
    } catch (error) {
      await eventsStorageProvider.deletePublicPhoto(storagePath).catch(() => null)
      throw error
    }
  },
}
