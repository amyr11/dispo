import type { User } from "@supabase/supabase-js"

import { authRepository } from "@/features/auth/server/repository"
import {
  ProfileLookupError,
  ProfileRequiredError,
  UnauthorizedError,
} from "@/features/auth/server/errors"
import type {
  AuthenticatedProfile,
  ProfileSetupState,
  ProfileSummary,
} from "@/features/auth/server/types"

function getAvatarUrl(user: User): string | null {
  const avatarKeys = ["avatar_url", "picture"]
  const metadataSources = [
    user.user_metadata,
    ...(user.identities?.map((identity) => identity.identity_data) ?? []),
  ]

  for (const metadata of metadataSources) {
    if (!metadata) continue

    for (const key of avatarKeys) {
      const value = metadata[key]
      if (typeof value === "string" && value) {
        return value
      }
    }
  }

  return null
}

function summarizeUser(user: User) {
  return {
    id: user.id,
    email: user.email ?? undefined,
  }
}

export const authService = {
  async requireAuth(): Promise<AuthenticatedProfile> {
    const { user, userError, profile, profileError } =
      await authRepository.getCurrentUserWithProfile()

    if (userError || !user) {
      throw new UnauthorizedError()
    }

    if (profileError) {
      console.error(profileError)
      throw new ProfileLookupError()
    }

    if (!profile) {
      throw new ProfileRequiredError()
    }

    return { user, profile }
  },

  async getProfile(): Promise<ProfileSummary> {
    const { user, userError, profile, profileError } =
      await authRepository.getCurrentUserWithProfile()

    if (userError || !user) {
      return { user: null, profile: null, avatarUrl: null }
    }

    if (profileError) {
      console.error("Profile fetch error:", profileError)
    }

    return {
      user: summarizeUser(user),
      profile,
      avatarUrl: getAvatarUrl(user),
    }
  },

  async getProfileSetupState(): Promise<ProfileSetupState> {
    const { user, userError, profile, profileError } =
      await authRepository.getCurrentUserWithProfileId()

    if (userError || !user) {
      throw new UnauthorizedError()
    }

    if (profileError) {
      console.error(profileError)
      throw new ProfileLookupError()
    }

    return { user, profile }
  },
}
