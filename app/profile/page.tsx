import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/features/auth/components/logout-button"
import { authService } from "@/features/auth/server/service"
import Link from "next/link"

export default async function ProfilePage() {
  const { profile } = await authService.getProfile()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <p>User: {profile?.user_name}</p>
      <Link href="/dashboard">
        <Button>Go to dashboard</Button>
      </Link>
      <LogoutButton />
    </div>
  )
}
