import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Ensures a user is authenticated and has a completed profile.
 * Returns the profile data if successful, otherwise redirects.
 */
export async function requireAuth() {
  const supabase = await createClient()

  // 1. Check Auth Session
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // 2. Check Profile (matches the user ID in the schema) [cite: 38, 40]
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, user_name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(profileError)
    redirect("/auth/login")
  }

  // 3. Handle missing profile (e.g., initial setup flow)
  if (!profile) {
    redirect("/profile/setup")
  }

  return { user, profile }
}