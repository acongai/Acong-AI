"use client"

import { Coins, TriangleAlert } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { COPY } from "@/lib/copy"

interface CreditBadgeProps {
  balance: number | null
  error?: string | null
  isLoading?: boolean
  lowCredits?: boolean
}

export function CreditBadge({
  balance,
  error,
  isLoading = false,
  lowCredits = false,
}: CreditBadgeProps) {
  const balanceLabel =
    balance === null && !error
      ? COPY.badge.preview
      : balance ?? "-"

  if (isLoading) {
    return <Skeleton className="h-8 w-[120px] rounded bg-[#E4E4E4]" />
  }

  return (
    <div className="flex items-center gap-2 rounded border border-[#E4E4E4] bg-white px-3 py-1.5">
      <Coins className="h-4 w-4 text-[#666666]" />
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#999999]">
          {COPY.badge.credits}
        </p>
        <p className="text-[13px] font-medium text-[#111111]">
          {balanceLabel}
        </p>
      </div>

      {lowCredits ? (
        <span className="flex items-center gap-1 text-xs text-[#F76B15]">
          <TriangleAlert className="h-3.5 w-3.5" />
          {COPY.badge.low}
        </span>
      ) : null}

      {error ? (
        <span className="text-xs text-[#F76B15]">{error}</span>
      ) : null}
    </div>
  )
}
