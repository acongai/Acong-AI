"use client"

import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/lib/db/types"

function getRequiredEnv(name: string): string {
  const value = process.env[name]

  if (value) {
    return value
  }

  if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    return "https://placeholder.supabase.co"
  }

  return "placeholder-anon-key"
}

export function createClient() {
  return createBrowserClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  )
}
