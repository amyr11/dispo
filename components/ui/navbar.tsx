import Link from "next/link"
import { getProfile } from "@/features/auth/services/auth-utils"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import { CameraSmile01Icon } from "@hugeicons/core-free-icons"
import { NavbarWrapper } from "./navbar-wrapper"

export async function Navbar() {
  const { user, avatarUrl } = await getProfile()

  if (!user) return null

  return (
    <NavbarWrapper>
      <div className="mx-auto my-0 flex h-14 max-w-lg items-center justify-between px-4">
        <a href="#" className="flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HugeiconsIcon
              icon={CameraSmile01Icon}
              strokeWidth={2}
              className="size-6"
            />
          </div>
          <h1 className="font-heading text-xl">Candid</h1>
        </a>

        {avatarUrl ? (
          <Link href="/profile">
            <Avatar>
              <AvatarImage src={avatarUrl} alt={user?.id ?? "User"} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <div className="h-9 w-9 rounded-full bg-gray-300" />
        )}
      </div>
    </NavbarWrapper>
  )
}
