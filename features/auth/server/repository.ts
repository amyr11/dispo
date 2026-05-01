import { createClient } from "@/lib/supabase/server"
import type { UserProfile } from "@/features/auth/server/types"

export const authRepository = {
  async getCurrentUserWithProfile() {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        user: null,
        userError,
        profile: null,
        profileError: null,
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, user_name")
      .eq("id", user.id)
      .maybeSingle<UserProfile>()

    return {
      user,
      userError,
      profile,
      profileError,
    }
  },

  async getCurrentUserWithProfileId() {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        user: null,
        userError,
        profile: null,
        profileError: null,
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle<Pick<UserProfile, "id">>()

    return {
      user,
      userError,
      profile,
      profileError,
    }
  },
}
