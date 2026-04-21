export type Event = {
  id: number
  user_id: string
  createdAt: number
  eventName: string
  eventStart: string
  revealAt: string
  attendeeLimit: number
  photoLimit: number
  password: string
}

export type CreateEventInput = Omit<Event, 'id' | 'user_id' | 'createdAt' | 'revealAt'> & {
  password: string
}