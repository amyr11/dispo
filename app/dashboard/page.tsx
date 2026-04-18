import { LogoutButton } from "@/features/auth/components/logout-button"
import { requireAuth } from "@/features/auth/services/auth-utils"

export default async function Dashboard() {
  const { user, profile } = await requireAuth()

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{profile.user_name ?? user.email}</span>
      </p>
      <LogoutButton />
    </div>
  )
}
