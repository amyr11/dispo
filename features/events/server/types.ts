export type EventRecord = {
  id: number
  userId: string
  createdAt: Date
  eventName: string
  eventStart: Date
  eventEnd: Date
  revealAt: Date
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type AttendeeRecord = {
  nickname: string
  fingerprint: string
  joinedAt: Date
  eventId: number
}

export type CreateEventInput = {
  eventName: string
  eventStart: string
  eventEnd: string
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type UpdateEventInput = Partial<CreateEventInput>

export type JoinPublicEventInput = {
  password: string
  nickname: string
  fingerprint: string
}

export type PublicPhotoCaptureInput = {
  fingerprint: string
  takenAt: string
}

export type PublicAttendeeCaptureState = {
  shotsTaken: number
  photoLimit: number
  revealAt: Date
}

export type EventPhotoRecord = {
  id: bigint
  takenAt: Date
  storagePath: string
}

export type OwnerAttendeeSummaryRecord = {
  nickname: string
  joinedAt: Date
  shotsTaken: number
}
