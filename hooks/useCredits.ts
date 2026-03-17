"use client"

import { useEffect, useState } from "react"

import { createClient } from "@/supabase/client"
import { COPY } from "@/lib/copy"

interface CreditsState {
  balance: number | null
  error: string | null
  hasCredits: boolean
  isLoading: boolean
  lowCredits: boolean
}

const INITIAL_STATE: CreditsState = {
  balance: null,
  error: null,
  hasCredits: false,
  isLoading: true,
  lowCredits: false,
}

export function useCredits() {
  const [state, setState] = useState<CreditsState>(INITIAL_STATE)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadCredits() {
      setState((current) => ({
        ...current,
        error: null,
        isLoading: true,
      }))

      try {
        const response = await fetch("/api/wallet", {
          cache: "no-store",
        })

        if (cancelled) {
          return
        }

        if (response.status === 401) {
          setState({
            balance: null,
            error: null,
            hasCredits: false,
            isLoading: false,
            lowCredits: false,
          })
          return
        }

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string }

          throw new Error(payload.error ?? COPY.api.walletGeneric)
        }

        const payload = (await response.json()) as {
          balance: number
          hasCredits: boolean
          lowCredits: boolean
        }

        if (cancelled) {
          return
        }

        setState({
          balance: payload.balance,
          error: null,
          hasCredits: payload.hasCredits,
          isLoading: false,
          lowCredits: payload.lowCredits,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState({
          balance: null,
          error:
            error instanceof Error
              ? error.message
              : COPY.api.walletGeneric,
          hasCredits: false,
          isLoading: false,
          lowCredits: false,
        })
      }
    }

    void loadCredits()

    return () => {
      cancelled = true
    }
  }, [refreshTick])

  // Sync credits with auth state: reset on logout, refresh on login
  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setState({
          balance: null,
          error: null,
          hasCredits: false,
          isLoading: false,
          lowCredits: false,
        })
      } else if (event === "SIGNED_IN") {
        setRefreshTick((current) => current + 1)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    ...state,
    refresh: () => setRefreshTick((current) => current + 1),
  }
}
