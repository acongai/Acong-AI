"use client"

import { useEffect, useState } from "react"
import { Coins, X } from "lucide-react"

import { createClient } from "@/supabase/client"

export type PlanId = "free" | "basic" | "pro"

const PLANS = [
  {
    id: "free" as PlanId,
    name: "Ga Modal",
    subtitle: "Buat yang belum yakin mau serius",
    credits: 5,
    price: "Gratis",
    cta: "Ambil gratisan",
    apiPlan: null,
    badge: null,
  },
  {
    id: "basic" as PlanId,
    name: "Miskin",
    subtitle: "Lumayan lah daripada nggak",
    credits: 100,
    price: "Rp 10.000",
    cta: "Pilih ini",
    apiPlan: "basic",
    badge: null,
  },
  {
    id: "pro" as PlanId,
    name: "Ga miskin-miskin amat",
    subtitle: "Buat yang agak serius tapi ga mau ngaku",
    credits: 200,
    price: "Rp 20.000",
    cta: "Pilih ini juga boleh",
    apiPlan: "pro",
    badge: "Paling worth",
  },
]

interface PricingPopupProps {
  isAuthenticated: boolean
  isOpen: boolean
  onClose: () => void
  /** Pass user's current plan when known; if omitted, popup fetches it from profile. */
  currentPlan?: PlanId
  /** onboarding = post-login, no highlight. manage = from badge click, highlight active. */
  mode?: "onboarding" | "manage"
}

export function PricingPopup({
  isAuthenticated,
  isOpen,
  onClose,
  currentPlan: currentPlanProp,
  mode = "onboarding",
}: PricingPopupProps) {
  const [currentPlan, setCurrentPlan] = useState<PlanId>(currentPlanProp ?? "free")
  const [loading, setLoading] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)

  // In manage mode without prop, fetch current plan from profile
  useEffect(() => {
    if (!isOpen || mode !== "manage" || currentPlanProp !== undefined) return

    const supabase = createClient()
    let cancelled = false

    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data } = await supabase
        .from("profiles")
        .select("current_plan")
        .eq("id", user.id)
        .single()

      if (!cancelled && data?.current_plan) {
        setCurrentPlan(data.current_plan as PlanId)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, currentPlanProp, mode])

  useEffect(() => {
    if (currentPlanProp !== undefined) {
      setCurrentPlan(currentPlanProp)
    }
  }, [currentPlanProp])

  // Reset error when closed
  useEffect(() => {
    if (!isOpen) setError(null)
  }, [isOpen])

  async function handleSelectPlan(plan: (typeof PLANS)[number]) {
    if (!isAuthenticated) {
      onClose()
      window.dispatchEvent(new CustomEvent("acong:login:open"))
      return
    }

    if (plan.id === "free") {
      onClose()
      return
    }

    setLoading(plan.id)
    setError(null)

    try {
      const packageCode = `package_${plan.apiPlan}`
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error ?? "Top-up gagal")
      }

      const payload = (await response.json()) as { checkoutUrl: string }
      window.location.href = payload.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up gagal, coba lagi")
    } finally {
      setLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" style={{ maxHeight: "90dvh" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-[#E4E4E4] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111111]">Pilih Plan</h2>
            <p className="text-sm text-[#666666]">Top up credits buat chat sama ACONG</p>
          </div>
          <button
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[#666666] transition-colors hover:bg-[#F8F8F8] hover:text-[#111111]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isActive = isAuthenticated && mode === "manage" && currentPlan === plan.id
            const isUpgrade =
              isAuthenticated && mode === "manage" && plan.id === "pro" && currentPlan === "basic"
            const isDowngrade =
              isAuthenticated && mode === "manage" && plan.id === "basic" && currentPlan === "pro"
            const isLoading = loading === plan.id

            let ctaLabel = plan.cta
            if (isActive) ctaLabel = "Plan Aktif"
            else if (isUpgrade) ctaLabel = "Upgrade"
            else if (isDowngrade) ctaLabel = "Downgrade"

            return (
              <div className="relative pt-3" key={plan.id}>
                {plan.badge ? (
                  <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap">
                    <span className="rounded-full bg-[#22c55e] px-3 py-1 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </span>
                  </div>
                ) : null}

                <div
                  className={`flex flex-col overflow-hidden rounded-xl border-2 transition-all ${
                    isActive
                      ? "border-[#111111]"
                      : "border-[#E4E4E4] hover:border-[#AAAAAA]"
                  }`}
                >
                {/* Dark plan name header */}
                <div className="bg-[#111111] px-4 py-3">
                  <p className="text-sm font-bold text-white">{plan.name}</p>
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                  <p className="mb-3 text-xs text-[#666666]">{plan.subtitle}</p>
                  <div className="mb-3 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-[#666666]" />
                    <p className="text-2xl font-bold text-[#111111]">{plan.credits}</p>
                    <p className="text-xs text-[#999999]">credits</p>
                  </div>
                  <p className="mb-4 text-sm font-semibold text-[#111111]">{plan.price}</p>

                  <button
                    className={`mt-auto w-full rounded px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "cursor-default bg-[#F2F2F2] text-[#999999]"
                        : "bg-[#111111] text-white hover:bg-[#222222] disabled:opacity-60"
                    }`}
                    disabled={isLoading || isActive}
                    onClick={() => void handleSelectPlan(plan)}
                    type="button"
                  >
                    {isLoading ? "Loading..." : ctaLabel}
                  </button>
                </div>
                </div>
              </div>
            )
          })}
        </div>

        {error ? (
          <div className="px-6 pb-4">
            <p className="text-sm text-[#E5484D]">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
