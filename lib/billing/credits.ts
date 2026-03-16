import { createAdminClient } from "@/lib/db/client"
import type {
  CreditLedgerInsert,
  CreditLedgerRow,
  CreditLedgerType,
  CreditReferenceType,
  WalletRow,
} from "@/lib/db/types"

import { ensureWallet } from "./wallet"

export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits") {
    super(message)
    this.name = "InsufficientCreditsError"
  }
}

interface CreditChangeParams {
  amount: number
  note?: string
  referenceId?: string | null
  referenceType?: CreditReferenceType | null
  type: CreditLedgerType
  userId: string
}

interface CreditChangeResult {
  balance: number
  ledger: CreditLedgerRow
  wallet: WalletRow
}

async function changeCredits({
  amount,
  note,
  referenceId = null,
  referenceType = null,
  type,
  userId,
}: CreditChangeParams): Promise<CreditChangeResult> {
  const admin = createAdminClient()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const wallet = await ensureWallet(userId)
    const currentBalance = wallet.balance ?? 0
    const nextBalance = currentBalance + amount

    if (nextBalance < 0) {
      throw new InsufficientCreditsError()
    }

    const { data: updatedWalletData, error: updateError } = await admin
      .from("wallets")
      .update({
        balance: nextBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .eq("balance", currentBalance)
      .select("*")
      .maybeSingle()

    if (updateError) {
      throw updateError
    }

    if (!updatedWalletData) {
      continue
    }

    const ledgerRow: CreditLedgerInsert = {
      user_id: userId,
      wallet_id: wallet.id,
      type,
      amount,
      balance_after: nextBalance,
      reference_type: referenceType,
      reference_id: referenceId,
      note: note ?? null,
    }

    const { data: ledgerData, error: ledgerError } = await admin
      .from("credit_ledger")
      .insert(ledgerRow)
      .select("*")
      .single()

    if (ledgerError) {
      await admin
        .from("wallets")
        .update({
          balance: currentBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id)
        .eq("balance", nextBalance)

      throw ledgerError
    }

    return {
      balance: nextBalance,
      ledger: ledgerData as CreditLedgerRow,
      wallet: updatedWalletData as WalletRow,
    }
  }

  throw new Error("Credit update could not be completed after retries")
}

export async function getCurrentBalance(userId: string) {
  const wallet = await ensureWallet(userId)
  return wallet.balance ?? 0
}

export async function hasEnoughCredits(userId: string, amount = 1) {
  const balance = await getCurrentBalance(userId)
  return balance >= amount
}

export async function grantCredits(
  userId: string,
  amount: number,
  options?: Omit<CreditChangeParams, "amount" | "type" | "userId">,
) {
  return changeCredits({
    amount: Math.abs(amount),
    note: options?.note,
    referenceId: options?.referenceId,
    referenceType: options?.referenceType,
    type: "grant",
    userId,
  })
}

export async function purchaseCredits(
  userId: string,
  amount: number,
  options?: Omit<CreditChangeParams, "amount" | "type" | "userId">,
) {
  return changeCredits({
    amount: Math.abs(amount),
    note: options?.note,
    referenceId: options?.referenceId,
    referenceType: options?.referenceType,
    type: "purchase",
    userId,
  })
}

export async function debitCredits(
  userId: string,
  amount: number,
  options?: Omit<CreditChangeParams, "amount" | "type" | "userId">,
) {
  return changeCredits({
    amount: -Math.abs(amount),
    note: options?.note,
    referenceId: options?.referenceId,
    referenceType: options?.referenceType,
    type: "debit",
    userId,
  })
}

export async function refundCredits(
  userId: string,
  amount: number,
  options?: Omit<CreditChangeParams, "amount" | "type" | "userId">,
) {
  return changeCredits({
    amount: Math.abs(amount),
    note: options?.note,
    referenceId: options?.referenceId,
    referenceType: options?.referenceType,
    type: "refund",
    userId,
  })
}
