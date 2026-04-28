import { CreateEventInput, Event } from "@/features/events/types/event-types"

type EventStats = {
  attendeesCount: number
  shotsCount: number
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(body.error ?? "Request failed")
  }

  return response.json() as Promise<T>
}

export async function getEvents(): Promise<Event[]> {
  const response = await fetch("/api/events", {
    method: "GET",
    credentials: "include",
  })
  return parseJson<Event[]>(response)
}

export async function getEvent(eventId: number): Promise<Event> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: "GET",
    credentials: "include",
  })
  return parseJson<Event>(response)
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const response = await fetch("/api/events", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return parseJson<Event>(response)
}

export async function updateEvent(eventId: number, input: Partial<CreateEventInput>): Promise<Event> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return parseJson<Event>(response)
}

export async function deleteEvent(eventId: number): Promise<void> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: "DELETE",
    credentials: "include",
  })
  await parseJson<{ success: boolean }>(response)
}

export async function getEventStats(eventId: number): Promise<EventStats> {
  const response = await fetch(`/api/events/${eventId}/stats`, {
    method: "GET",
    credentials: "include",
  })
  return parseJson<EventStats>(response)
}
