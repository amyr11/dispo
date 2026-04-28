import { prisma } from "@/lib/prisma"
import { CreateEventInput, UpdateEventInput } from "@/features/events/server/types"

export const eventsRepository = {
  findManyByUserId(userId: string) {
    return prisma.event.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
  },

  findOneByIdAndUserId(eventId: number, userId: string) {
    return prisma.event.findFirst({
      where: { id: eventId, userId },
    })
  },

  createForUser(userId: string, input: CreateEventInput, revealAt: Date) {
    return prisma.event.create({
      data: {
        userId,
        eventName: input.eventName,
        eventStart: new Date(input.eventStart),
        revealAt,
        attendeeLimit: input.attendeeLimit,
        photoLimit: input.photoLimit,
        password: input.password,
      },
    })
  },

  updateByIdAndUserId(eventId: number, userId: string, input: UpdateEventInput, revealAt?: Date) {
    return prisma.event.updateMany({
      where: { id: eventId, userId },
      data: {
        ...(input.eventName ? { eventName: input.eventName } : {}),
        ...(input.eventStart ? { eventStart: new Date(input.eventStart) } : {}),
        ...(typeof input.attendeeLimit === "number" ? { attendeeLimit: input.attendeeLimit } : {}),
        ...(typeof input.photoLimit === "number" ? { photoLimit: input.photoLimit } : {}),
        ...(input.password ? { password: input.password } : {}),
        ...(revealAt ? { revealAt } : {}),
      },
    })
  },

  deleteByIdAndUserId(eventId: number, userId: string) {
    return prisma.event.deleteMany({
      where: { id: eventId, userId },
    })
  },

  async countAttendeesByEventId(eventId: number) {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM attendees
      WHERE "eventId" = ${eventId}
    `
    return rows[0]?.count ?? 0
  },

  async countPhotosByEventId(eventId: number) {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM photos
      WHERE "eventId" = ${eventId}
    `
    return rows[0]?.count ?? 0
  },
}
