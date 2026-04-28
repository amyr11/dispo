import { createEventController, listEventsController } from "@/features/events/server/controller"

export async function GET() {
  return listEventsController()
}

export async function POST(req: Request) {
  return createEventController(req)
}
