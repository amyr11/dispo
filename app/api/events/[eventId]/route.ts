import {
  deleteEventController,
  getEventController,
  updateEventController,
} from "@/features/events/server/controller"

export async function GET(_: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params
  return getEventController(eventId)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params
  return updateEventController(req, eventId)
}

export async function DELETE(_: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params
  return deleteEventController(eventId)
}
