// components/navbar-wrapper.tsx
"use client"

import { useEffect, useState } from "react"

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-10 transition-all duration-300 ${
        scrolled
          ? "border-b bg-muted/70 opacity-100 backdrop-blur-sm"
          : "bg-transparent opacity-100 backdrop-blur-none"
      }`}
    >
      {children}
    </nav>
  )
}
