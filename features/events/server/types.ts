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

export type CreateEventInput = {
  eventName: string
  eventStart: string
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type UpdateEventInput = Partial<CreateEventInput>
