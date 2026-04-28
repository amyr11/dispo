import { createClient } from "@/lib/supabase/server"

export const eventsStorageProvider = {
  async deleteEventFolder(eventId: number) {
    const supabase = await createClient()
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET

    if (!bucket) return

    const folder = `events/${eventId}`
    const { data: existing, error: listError } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 1000 })

    if (listError || !existing || existing.length === 0) {
      return
    }

    const paths = existing.map((item) => `${folder}/${item.name}`)
    await supabase.storage.from(bucket).remove(paths)
  },
}
