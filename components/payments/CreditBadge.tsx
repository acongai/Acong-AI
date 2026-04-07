"use client"

import { Coins, TriangleAlert } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { COPY } from "@/lib/copy"

interface CreditBadgeProps {
  balance: number | null
  error?: string | null
  isLoading?: boolean
  lowCredits?: boolean
  onClick?: () => void
}

export function CreditBadge({
  balance,
  error,
  isLoading = false,
  lowCredits = false,
  onClick,
}: CreditBadgeProps) {
  const balanceLabel = balance !== null ? balance : 0

  if (isLoading) {
    return <Skeleton className="h-5 w-16 rounded bg-[#E4E4E4]" />
  }

  return (
    <button
      className="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--muted-foreground)]"
      onClick={onClick}
      type="button"
    >
      <Coins className="h-4 w-4" />
      <span className="font-semibold text-[var(--foreground)]">{balanceLabel}</span>

      {lowCredits ? (
        <span className="flex items-center gap-0.5 text-xs text-[#F76B15]">
          <TriangleAlert className="h-3.5 w-3.5" />
          {COPY.badge.low}
        </span>
      ) : null}

      {error ? (
        <span className="text-xs text-[#F76B15]">{error}</span>
      ) : null}
    </button>
  )
}
