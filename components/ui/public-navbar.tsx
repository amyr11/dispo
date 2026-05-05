import Link from "next/link"
import { CameraSmile01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { NavbarWrapper } from "./navbar-wrapper"

export function PublicNavbar() {
  return (
    <NavbarWrapper>
      <div className="mx-auto my-2 flex h-14 w-full max-w-lg items-center px-4 sm:max-w-2xl">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HugeiconsIcon
              icon={CameraSmile01Icon}
              strokeWidth={2}
              className="size-6"
            />
          </div>
          <h1 className="font-heading text-xl">Candid</h1>
        </Link>
      </div>
    </NavbarWrapper>
  )
}
