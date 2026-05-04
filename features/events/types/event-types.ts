export type Event = {
  id: number
  userId: string
  createdAt: string
  eventName: string
  eventStart: string
  eventEnd: string
  revealAt: string
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type CreateEventInput = {
  eventName: string
  eventStart: string
  eventEnd: string
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type EditEventInput = Partial<CreateEventInput>
