export type EventRecord = {
  id: number
  userId: string
  createdAt: Date
  eventName: string
  eventStart: Date
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
