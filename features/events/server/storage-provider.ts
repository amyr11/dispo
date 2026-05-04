import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const PUBLIC_PHOTOS_BUCKET = "photos-bucket"
const SIGNED_URL_TTL_SECONDS = 60 * 60

export const eventsStorageProvider = {
  async deleteEventFolder(userId: string, eventId: number) {
    const adminClient = createAdminClient()
    const supabase = adminClient ?? (await createClient())
    const fallbackBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
    const folder = `${userId}/${eventId}`

    const buckets = new Set([PUBLIC_PHOTOS_BUCKET])
    if (fallbackBucket) {
      buckets.add(fallbackBucket)
    }

    for (const bucket of buckets) {
      const { data: existing, error: listError } = await supabase.storage
        .from(bucket)
        .list(folder, { limit: 1000 })

      if (listError || !existing || existing.length === 0) {
        continue
      }

      const paths = existing.map((item) => `${folder}/${item.name}`)
      await supabase.storage.from(bucket).remove(paths)
    }
  },

  buildPublicPhotoStoragePath(
    userId: string,
    eventId: number,
    takenAt: Date
  ): string {
    const safeTimestamp = takenAt.toISOString().replaceAll(":", "-")
    return `${userId}/${eventId}/${safeTimestamp}-${crypto.randomUUID()}.jpg`
  },

  async uploadPublicPhoto(path: string, file: Blob) {
    const adminClient = createAdminClient()
    const supabase = adminClient ?? (await createClient())
    const bytes = Buffer.from(await file.arrayBuffer())
    const contentType = file.type || "image/jpeg"

    const { error } = await supabase.storage
      .from(PUBLIC_PHOTOS_BUCKET)
      .upload(path, bytes, {
        contentType,
        upsert: false,
      })

    if (error) {
      throw new Error(error.message || "Unable to upload photo")
    }
  },

  async deletePublicPhoto(path: string) {
    const adminClient = createAdminClient()
    const supabase = adminClient ?? (await createClient())
    await supabase.storage.from(PUBLIC_PHOTOS_BUCKET).remove([path])
  },

  async createPublicPhotoAccessUrl(path: string) {
    const adminClient = createAdminClient()

    if (adminClient) {
      const { data, error } = await adminClient.storage
        .from(PUBLIC_PHOTOS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Unable to generate photo URL")
      }

      return data.signedUrl
    }

    const supabase = await createClient()
    const { data } = supabase.storage.from(PUBLIC_PHOTOS_BUCKET).getPublicUrl(path)
    if (!data.publicUrl) {
      throw new Error("Unable to generate photo URL")
    }
    return data.publicUrl
  },

  async downloadPublicPhoto(path: string) {
    const adminClient = createAdminClient()
    const supabase = adminClient ?? (await createClient())
    const { data, error } = await supabase.storage
      .from(PUBLIC_PHOTOS_BUCKET)
      .download(path)

    if (error || !data) {
      throw new Error(error?.message || "Unable to download photo")
    }

    return Buffer.from(await data.arrayBuffer())
  },
}
