import { redirect } from "next/navigation"

import { ProfileSetupForm } from "@/features/auth/components/profile-setup-form"
import {
  ProfileLookupError,
  UnauthorizedError,
} from "@/features/auth/server/errors"
import { authService } from "@/features/auth/server/service"

async function getProfileSetupState() {
  try {
    return await authService.getProfileSetupState()
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ProfileLookupError
    ) {
      redirect("/auth/login")
    }

    throw error
  }
}

export default async function ProfileSetupPage() {
  const { profile } = await getProfileSetupState()

  if (profile) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <ProfileSetupForm />
      </div>
    </div>
  )
}
