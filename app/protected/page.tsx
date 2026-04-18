import { redirect } from "next/navigation"

import { LogoutButton } from "@/features/auth/components/logout-button"
import { createClient } from "@/lib/supabase/server"

export default async function ProtectedPage() {
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
    .select("id, user_name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(profileError)
    redirect("/auth/login")
  }

  if (!profile) {
    redirect("/profile/setup")
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{profile.user_name ?? user.email}</span>
      </p>
      <LogoutButton />
    </div>
  )
}
