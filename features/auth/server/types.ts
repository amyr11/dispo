import type { User } from "@supabase/supabase-js"

export type UserProfile = {
  id: string
  user_name: string
}

export type AuthenticatedProfile = {
  user: User
  profile: UserProfile
}

export type ProfileSummary = {
  user: { id: string; email?: string } | null
  profile: UserProfile | null
  avatarUrl: string | null
}

export type ProfileSetupState = {
  user: User
  profile: Pick<UserProfile, "id"> | null
}
