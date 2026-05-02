import { Prisma } from "@prisma/client"
import { eventsRepository } from "@/features/events/server/repository"
import { eventsStorageProvider } from "@/features/events/server/storage-provider"
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/features/events/server/errors"
import {
  CreateEventInput,
  JoinPublicEventInput,
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

    await eventsStorageProvider.deleteEventFolder(eventId)
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
}
