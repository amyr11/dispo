import { getOwnerAttendeesController } from "@/features/events/server/controller"

export async function GET(_: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params
  return getOwnerAttendeesController(eventId)
}
