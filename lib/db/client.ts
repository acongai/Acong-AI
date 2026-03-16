import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/db/types"

function getRequiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getSupabaseUrl(): string {
  return getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")
}

export function getSupabaseAnonKey(): string {
  return getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export function getSupabaseServiceRoleKey(): string {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
}

export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
