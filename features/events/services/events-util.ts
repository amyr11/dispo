import { Event } from "@/features/events/types/event-types"

const eventsList: Event[] = [
  {
    eventName: "Monica's Birthday",
    eventDate: "04/22/2026",
    maxAttendees: 50,
    photoLimit: 10,
  },
  {
    eventName: "Monica & Chandler's Wedding",
    eventDate: "04/30/2026",
    maxAttendees: 80,
    photoLimit: 5,
  },
]

export function getEvents(): Event[] {
  return eventsList
}

export function createEvent(event: Event): Event {
  eventsList.push(event)
  return event
}
