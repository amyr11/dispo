"use server"

import { createClient } from "@/lib/supabase/server"
import { CreateEventInput, EditEventInput, Event } from "@/features/events/types/event-types"

export async function getEvents(): Promise<Event[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getEvent(eventId: number): Promise<Event> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

function computeRevealAt(eventStart: string | Date): Date {
  const revealAt = new Date(eventStart)
  revealAt.setDate(revealAt.getDate() + 1)
  revealAt.setHours(12, 0, 0, 0)
  return revealAt
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
  .from('events')
  .insert({
    eventName: input.eventName,
    eventStart: input.eventStart,
    attendeeLimit: input.attendeeLimit,
    photoLimit: input.photoLimit,
    user_id: user.id,
    createdAt: new Date().toISOString(),
    revealAt: computeRevealAt(input.eventStart).toISOString(),
    password: input.password,
  })
  .select()
  .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateEvent(eventId: number, input: EditEventInput): Promise<Event> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: EditEventInput = { ...input }

  if (input.eventStart) {
    updateData.revealAt = computeRevealAt(input.eventStart)
  }

  const { data, error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteEvent(eventId: number): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)
}

export async function getAttendeesCount(eventId: number): Promise<number> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { count, error } = await supabase
    .from("attendees")
    .select("*", { count: "exact", head: true })
    .eq("eventId", eventId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getShotsCount(eventId: number): Promise<number> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { count, error } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("eventId", eventId)

  if (error) throw new Error(error.message)
  return count ?? 0
}