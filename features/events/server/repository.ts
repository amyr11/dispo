import { prisma } from "@/lib/prisma"
import {
  CreateEventInput,
  EventPhotoRecord,
  JoinPublicEventInput,
  PublicAttendeeCaptureState,
  UpdateEventInput,
} from "@/features/events/server/types"

const attendeePublicSelect = {
  nickname: true,
  fingerprint: true,
} as const

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

  findOneById(eventId: number) {
    return prisma.event.findUnique({
      where: { id: eventId },
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

  updateByIdAndUserId(
    eventId: number,
    userId: string,
    input: UpdateEventInput,
    revealAt?: Date
  ) {
    return prisma.event.updateMany({
      where: { id: eventId, userId },
      data: {
        ...(input.eventName ? { eventName: input.eventName } : {}),
        ...(input.eventStart ? { eventStart: new Date(input.eventStart) } : {}),
        ...(typeof input.attendeeLimit === "number"
          ? { attendeeLimit: input.attendeeLimit }
          : {}),
        ...(typeof input.photoLimit === "number"
          ? { photoLimit: input.photoLimit }
          : {}),
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
    return prisma.attendee.count({
      where: { eventId },
    })
  },

  async countPhotosByEventId(eventId: number) {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM photos
      WHERE "eventId" = ${eventId}
        AND deleted = false
    `
    return rows[0]?.count ?? 0
  },

  async findPublicPhotosByEventId(eventId: number): Promise<EventPhotoRecord[]> {
    return prisma.$queryRaw<EventPhotoRecord[]>`
      SELECT
        p.id,
        p."takenAt" AS "takenAt",
        p."storagePath" AS "storagePath"
      FROM photos p
      WHERE p."eventId" = ${eventId}
        AND p.deleted = false
      ORDER BY p."takenAt" ASC
    `
  },

  async findOwnerPhotosByEventId(
    eventId: number,
    userId: string
  ): Promise<EventPhotoRecord[]> {
    return prisma.$queryRaw<EventPhotoRecord[]>`
      SELECT
        p.id,
        p."takenAt" AS "takenAt",
        p."storagePath" AS "storagePath"
      FROM photos p
      INNER JOIN events e ON e.id = p."eventId"::int
      WHERE p."eventId"::int = ${eventId}
        AND e."user_id" = ${userId}::uuid
        AND p.deleted = false
      ORDER BY p."takenAt" ASC
    `
  },

  async softDeletePhotoByIdAndEventIdAndUserId(input: {
    eventId: number
    photoId: bigint
    userId: string
  }) {
    return prisma.$executeRaw`
      UPDATE photos p
      SET deleted = true
      FROM events e
      WHERE p.id = ${input.photoId}
        AND p."eventId"::int = ${input.eventId}
        AND e.id = p."eventId"::int
        AND e."user_id" = ${input.userId}::uuid
    `
  },

  findAttendeeByEventIdAndFingerprint(eventId: number, fingerprint: string) {
    return prisma.attendee.findUnique({
      where: {
        eventId_fingerprint: {
          eventId,
          fingerprint,
        },
      },
      select: attendeePublicSelect,
    })
  },

  findAttendeeByEventIdAndNickname(eventId: number, nickname: string) {
    return prisma.attendee.findUnique({
      where: {
        eventId_nickname: {
          eventId,
          nickname,
        },
      },
      select: attendeePublicSelect,
    })
  },

  createAttendee(eventId: number, input: JoinPublicEventInput) {
    return prisma.attendee.create({
      data: {
        eventId,
        nickname: input.nickname,
        fingerprint: input.fingerprint,
      },
      select: attendeePublicSelect,
    })
  },

  async getPublicAttendeeCaptureState(
    eventId: number,
    fingerprint: string
  ): Promise<PublicAttendeeCaptureState | null> {
    const rows = await prisma.$queryRaw<
      Array<{ shotsTaken: number; photoLimit: number; revealAt: Date }>
    >`
      SELECT
        COALESCE(COUNT(p.id), 0)::int AS "shotsTaken",
        e."photoLimit"::int AS "photoLimit",
        e."revealAt" AS "revealAt"
      FROM attendees a
      INNER JOIN events e ON e.id = a."eventId"
      LEFT JOIN photos p
        ON p."attendeeId" = a.id
       AND p.deleted = false
      WHERE a."eventId" = ${eventId}
        AND a.fingerprint = ${fingerprint}
      GROUP BY e."photoLimit", e."revealAt"
      LIMIT 1
    `

    const attendee = rows[0]

    if (!attendee) {
      return null
    }

    return {
      shotsTaken: attendee.shotsTaken,
      photoLimit: attendee.photoLimit,
      revealAt: attendee.revealAt,
    }
  },

  async createPublicAttendeePhotoAndIncrementCounter(input: {
    eventId: number
    fingerprint: string
    takenAt: Date
    storagePath: string
  }): Promise<
    | { status: "captured"; shotsTaken: number; photoLimit: number }
    | { status: "limit-reached"; shotsTaken: number; photoLimit: number }
    | { status: "not-found" }
  > {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ attendeeId: bigint; photoLimit: number }>
      >`
        SELECT
          a.id AS "attendeeId",
          e."photoLimit"::int AS "photoLimit"
        FROM attendees a
        INNER JOIN events e ON e.id = a."eventId"
        WHERE a."eventId" = ${input.eventId}
          AND a.fingerprint = ${input.fingerprint}
        LIMIT 1
        FOR UPDATE
      `

      const attendee = rows[0]

      if (!attendee) {
        return { status: "not-found" }
      }

      const countRows = await tx.$queryRaw<Array<{ shotsTaken: number }>>`
        SELECT COUNT(*)::int AS "shotsTaken"
        FROM photos
        WHERE "attendeeId" = ${attendee.attendeeId}
          AND deleted = false
      `

      const shotsTaken = countRows[0]?.shotsTaken ?? 0

      if (shotsTaken >= attendee.photoLimit) {
        return {
          status: "limit-reached",
          shotsTaken,
          photoLimit: attendee.photoLimit,
        }
      }

      await tx.$executeRaw`
        INSERT INTO photos ("deleted", "takenAt", "eventId", "attendeeId", "storagePath")
        VALUES (false, ${input.takenAt}, ${input.eventId}, ${attendee.attendeeId}, ${input.storagePath})
      `

      return {
        status: "captured",
        shotsTaken: shotsTaken + 1,
        photoLimit: attendee.photoLimit,
      }
    })
  },
}
