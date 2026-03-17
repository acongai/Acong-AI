"use client"

import { useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/supabase/client"

export function useAuth() {
  const [supabase] = useState(() => createClient())
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const userRef = useRef<User | null>(null)

  async function fetchPlan(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("current_plan")
      .eq("id", userId)
      .single()

    if (data?.current_plan) {
      setCurrentPlan(data.current_plan as string)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (cancelled) {
        return
      }

      userRef.current = currentUser
      setUser(currentUser)
      setIsLoading(false)

      if (currentUser) {
        void fetchPlan(currentUser.id)
      }
    }

    void loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) {
        return
      }

      userRef.current = session?.user ?? null
      setUser(session?.user ?? null)
      setIsLoading(false)

      if (session?.user) {
        void fetchPlan(session.user.id)
      } else {
        setCurrentPlan(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  // Re-fetch plan after a successful top-up (dispatched by PricingPopup)
  useEffect(() => {
    const handler = () => {
      if (userRef.current) void fetchPlan(userRef.current.id)
    }
    window.addEventListener("acong:credits:topup", handler)
    return () => window.removeEventListener("acong:credits:topup", handler)
  }, [])

  return {
    isAuthenticated: Boolean(user),
    isLoading,
    user,
    currentPlan,
  }
}
