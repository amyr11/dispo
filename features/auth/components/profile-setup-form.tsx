"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function ProfileSetupForm() {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Please enter your name.")
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        setError("Unable to verify your session. Please log in again.")
        return
      }

      const { error: insertError } = await supabase
        .from("users")
        .insert({ id: userData.user.id, user_name: trimmedName })

      if (insertError) {
        setError(
          insertError.message ||
            "Failed to save your profile. Please try again."
        )
        return
      }

      router.push("/protected")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            Welcome to Dispo! Let&apos;s make some memories.
          </CardTitle>
          <CardDescription>But first, tell us your name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Input
                id="user_name"
                type="text"
                placeholder="..."
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Let's go!"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
