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

type Profile = {
  id: string
  user_name: string
}

/**
 * Returns the authenticated user, their profile row (if any),
 * and the Google avatar URL (if the user signed‑in with Google).
 *
 * If there is no session, both `user` and `profile` are `null`
 * and `avatarUrl` is also `null`.
 */
export async function getProfile(): Promise<{
  user: { id: string; email?: string } | null
  profile: Profile | null
  avatarUrl: string | null
}> {
  const supabase = await createClient()

  // ── 1️⃣  Check auth session ────────────────────────────────────────
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { user: null, profile: null, avatarUrl: null }
  }

  // ── 2️⃣  Load the profile row (your own table) ───────────────────────
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("users")
    .select("id, user_name")
    .eq("id", user.id)
    .maybeSingle<Profile>()

  // If the query fails we still return the user (the caller can decide what to do)
  if (profileError) {
    console.error("Profile fetch error:", profileError)
  }

  // ── 3️⃣  Extract the avatar URL from the auth user metadata ───────────
  // `user.user_metadata` is populated for OAuth providers (Google, GitHub, …)
  const avatarUrl =
    // Typescript guard – `user_metadata` may be undefined for email‑password users
    typeof user.user_metadata === "object" && user.user_metadata?.avatar_url
      ? String(user.user_metadata.avatar_url)
      : null

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile,
    avatarUrl,
  }
}