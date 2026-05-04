"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep cache warm between route changes and revalidate in background.
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  })
}

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
