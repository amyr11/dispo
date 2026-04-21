import { Geist_Mono, IBM_Plex_Sans, Noto_Serif } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/features/auth/components/theme-provider"
import { cn } from "@/lib/utils"

import { ReactQueryProvider } from "@/lib/providers/react-query-provider"

const notoSerifHeading = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-heading",
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        ibmPlexSans.variable,
        notoSerifHeading.variable
      )}
    >
      <body className="bg-muted">
        <ThemeProvider>
          <ReactQueryProvider>
            <main>{children}</main>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
