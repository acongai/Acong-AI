"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/supabase/client"

export function useAuth() {
  const [supabase] = useState(() => createClient())
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const userRef = useRef<User | null>(null)

  const fetchPlan = useEffectEvent(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("current_plan, full_name")
      .eq("id", userId)
      .single()

    setCurrentPlan((data?.current_plan as string | null) ?? "free")
    setProfileName(data?.full_name as string | null)
  })

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
      } else {
        setCurrentPlan(null)
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

  useEffect(() => {
    const refreshFromForeground = () => {
      if (document.visibilityState !== "visible" || !userRef.current) {
        return
      }

      void fetchPlan(userRef.current.id)
    }

    window.addEventListener("focus", refreshFromForeground)
    document.addEventListener("visibilitychange", refreshFromForeground)

    return () => {
      window.removeEventListener("focus", refreshFromForeground)
      document.removeEventListener("visibilitychange", refreshFromForeground)
    }
  }, [])

  return {
    isAuthenticated: Boolean(user),
    isLoading,
    user,
    currentPlan,
    profileName,
  }
}
