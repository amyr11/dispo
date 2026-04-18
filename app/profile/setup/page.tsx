import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { ProfileSetupForm } from "@/components/profile-setup-form"

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(profileError)
    redirect("/auth/login")
  }

  if (profile) {
    redirect("/protected")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <ProfileSetupForm email={user.email ?? null} />
      </div>
    </div>
  )
}
