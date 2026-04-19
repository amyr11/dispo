"use server"

import { createClient } from "@/lib/supabase/server"
import { CreateEventInput, Event } from "@/features/events/types/event-types"
import bcrypt from 'bcrypt'

export async function getEvents(): Promise<Event[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("ownerId", user.id)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const eventStart = new Date(input.eventStart)
  const revealAt = new Date(eventStart)
  revealAt.setDate(revealAt.getDate() + 1)
  revealAt.setHours(12, 0, 0, 0)

  const passwordHash = await bcrypt.hash(input.password, 10)

  const { data, error } = await supabase
  .from('events')
  .insert({
    eventName: input.eventName,
    eventStart: input.eventStart,
    attendeeLimit: input.attendeeLimit,
    photoLimit: input.photoLimit,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    revealAt: revealAt.toISOString(),
    passwordHash,
  })
  .select()
  .single()

  if (error) throw new Error(error.message)
  return data
}