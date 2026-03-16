import type { User } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/db/client"
import type {
  AbuseSignalInsert,
  ProfileInsert,
  ProfileRow,
} from "@/lib/db/types"
import {
  type BrowserFingerprintDetails,
  parseFingerprintCookie,
  SIGNUP_FINGERPRINT_COOKIE,
} from "@/lib/utils/fingerprint"
import { createClient } from "@/supabase/server"

import { grantCredits } from "@/lib/billing/credits"
import { ensureWallet, FREE_TRIAL_CREDITS } from "@/lib/billing/wallet"

export interface AuthRequestMetadata {
  ip: string | null
  userAgent: string | null
  fingerprint: string | null
  fingerprintDetails: BrowserFingerprintDetails | null
}

function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null
  }

  return request.headers.get("x-real-ip")
}

function getUserDisplayName(user: User): string | null {
  const fromMetadata =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null

  if (fromMetadata) {
    return fromMetadata
  }

  if (!user.email) {
    return null
  }

  return user.email.split("@")[0] ?? null
}

export function getAuthRequestMetadata(request: NextRequest): AuthRequestMetadata {
  const parsedFingerprint = parseFingerprintCookie(
    request.cookies.get(SIGNUP_FINGERPRINT_COOKIE)?.value,
  )

  return {
    ip: getRequestIp(request),
    userAgent: request.headers.get("user-agent"),
    fingerprint: parsedFingerprint?.value ?? null,
    fingerprintDetails: parsedFingerprint?.details ?? null,
  }
}

async function ensureProfile(
  user: User,
  metadata: AuthRequestMetadata,
): Promise<{ profile: ProfileRow; createdProfile: boolean }> {
  const admin = createAdminClient()
  const { data: existingProfileData, error: existingProfileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()
  const existingProfile = existingProfileData as ProfileRow | null

  if (existingProfileError) {
    throw existingProfileError
  }

  if (existingProfile) {
    return {
      profile: existingProfile,
      createdProfile: false,
    }
  }

  const profileInsert: ProfileInsert = {
    id: user.id,
    email: user.email ?? null,
    display_name: getUserDisplayName(user),
    free_credits_granted: false,
    signup_ip: metadata.ip,
    signup_fingerprint: metadata.fingerprint,
    signup_user_agent: metadata.userAgent,
    status: "active",
    updated_at: new Date().toISOString(),
  }

  const { data: profileData, error } = await admin
    .from("profiles")
    .insert(profileInsert)
    .select("*")
    .single()
  const profile = profileData as ProfileRow

  if (error) {
    throw error
  }

  return {
    profile,
    createdProfile: true,
  }
}

async function insertAbuseSignals(rows: AbuseSignalInsert[]) {
  if (!rows.length) {
    return
  }

  const admin = createAdminClient()
  const { error } = await admin.from("abuse_signals").insert(rows)

  if (error) {
    throw error
  }
}

async function grantFreeTrialCredits(
  userId: string,
  metadata: AuthRequestMetadata,
): Promise<boolean> {
  const admin = createAdminClient()
  const { data: claim, error: claimError } = await admin
    .from("profiles")
    .update({
      free_credits_granted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("free_credits_granted", false)
    .select("id")
    .maybeSingle()

  if (claimError) {
    throw claimError
  }

  if (!claim) {
    return false
  }

  await grantCredits(userId, FREE_TRIAL_CREDITS, {
    note: "Initial free credits on first login",
    referenceType: "free_trial",
  })

  await insertAbuseSignals([
    {
      user_id: userId,
      fingerprint: metadata.fingerprint,
      ip: metadata.ip,
      signal_type: "free_credit_grant",
      signal_value: "5_free_credits",
      metadata: {
        userAgent: metadata.userAgent,
      },
    },
  ])

  return true
}

export async function ensureAccountSetup({
  user,
  request,
}: {
  user: User
  request: NextRequest
}) {
  const metadata = getAuthRequestMetadata(request)
  const { createdProfile } = await ensureProfile(user, metadata)
  await ensureWallet(user.id)

  if (createdProfile) {
    await insertAbuseSignals([
      {
        user_id: user.id,
        fingerprint: metadata.fingerprint,
        ip: metadata.ip,
        signal_type: "signup_ip",
        signal_value: metadata.ip ?? "unknown",
        metadata: {
          userAgent: metadata.userAgent,
        },
      },
      {
        user_id: user.id,
        fingerprint: metadata.fingerprint,
        ip: metadata.ip,
        signal_type: "signup_user_agent",
        signal_value: metadata.userAgent ?? "unknown",
        metadata: metadata.fingerprintDetails
          ? { ...metadata.fingerprintDetails }
          : null,
      },
      {
        user_id: user.id,
        fingerprint: metadata.fingerprint,
        ip: metadata.ip,
        signal_type: "signup_fingerprint",
        signal_value: metadata.fingerprint ?? "unknown",
        metadata: metadata.fingerprintDetails
          ? { ...metadata.fingerprintDetails }
          : null,
      },
    ])
  }

  await grantFreeTrialCredits(user.id, metadata)
}

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function requireSessionUser() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  return user
}
