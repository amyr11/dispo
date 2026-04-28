import { eventsRepository } from "@/features/events/server/repository"
import { eventsStorageProvider } from "@/features/events/server/storage-provider"
import { NotFoundError } from "@/features/events/server/errors"
import { CreateEventInput, UpdateEventInput } from "@/features/events/server/types"

function computeRevealAt(eventStartIso: string): Date {
  const revealAt = new Date(eventStartIso)
  revealAt.setDate(revealAt.getDate() + 1)
  revealAt.setHours(12, 0, 0, 0)
  return revealAt
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

  createEvent(userId: string, input: CreateEventInput) {
    return eventsRepository.createForUser(userId, input, computeRevealAt(input.eventStart))
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
}
