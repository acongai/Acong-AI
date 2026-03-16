"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/supabase/client"

export function useAuth() {
  const [supabase] = useState(() => createClient())
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (cancelled) {
        return
      }

      setUser(currentUser)
      setIsLoading(false)
    }

    void loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) {
        return
      }

      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  return {
    isAuthenticated: Boolean(user),
    isLoading,
    user,
  }
}
