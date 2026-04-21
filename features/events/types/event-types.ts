export type Event = {
  id: number
  ownerId: string
  createdAt: number
  eventName: string
  eventStart: string
  revealAt: string
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type CreateEventInput = Omit<Event, 'id' | 'ownerId' | 'createdAt' | 'revealAt'> & {
  password: string
}