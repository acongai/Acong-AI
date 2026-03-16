import { createAdminClient } from "@/lib/db/client"
import type { WalletRow } from "@/lib/db/types"

export const FREE_TRIAL_CREDITS = 5
export const LOW_CREDITS_THRESHOLD = 1

export const CREDIT_PACKAGES = {
  package_basic: {
    code: "package_basic",
    credits: 100,
    priceIdr: 10_000,
  },
  package_pro: {
    code: "package_pro",
    credits: 200,
    priceIdr: 20_000,
  },
} as const

export type CreditPackageCode = keyof typeof CREDIT_PACKAGES
export type CreditPackage = (typeof CREDIT_PACKAGES)[CreditPackageCode]

export interface WalletSummary {
  balance: number
  hasCredits: boolean
  lowCredits: boolean
  walletId: string
}

export async function ensureWallet(userId: string): Promise<WalletRow> {
  const admin = createAdminClient()

  await admin.from("wallets").upsert(
    {
      user_id: userId,
      balance: 0,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true,
    },
  )

  const { data, error } = await admin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    throw error
  }

  return data as WalletRow
}

export async function getWalletByUserId(userId: string) {
  return ensureWallet(userId)
}

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const wallet = await ensureWallet(userId)
  const balance = wallet.balance ?? 0

  return {
    balance,
    hasCredits: balance > 0,
    lowCredits: balance <= LOW_CREDITS_THRESHOLD,
    walletId: wallet.id,
  }
}

export function getCreditPackage(code: string): CreditPackage | null {
  if (code in CREDIT_PACKAGES) {
    return CREDIT_PACKAGES[code as CreditPackageCode]
  }

  return null
}
