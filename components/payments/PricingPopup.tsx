"use client"

import { useEffect, useState } from "react"
import { Coins, X } from "lucide-react"

import { createClient } from "@/supabase/client"
import { useLanguage } from "@/hooks/useLanguage"

export type PlanId = "free" | "basic" | "pro"

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
  const { copy } = useLanguage()

  const PLANS = [
    {
      id: "free" as PlanId,
      ...copy.pricing.plans.free,
      credits: 5,
      price: "Gratis",
      apiPlan: null,
      badge: null,
    },
    {
      id: "basic" as PlanId,
      ...copy.pricing.plans.basic,
      credits: 100,
      price: "Rp 10.000",
      apiPlan: "basic",
      badge: null,
    },
    {
      id: "pro" as PlanId,
      ...copy.pricing.plans.pro,
      credits: 200,
      price: "Rp 20.000",
      apiPlan: "pro",
      badge: "Paling worth",
    },
  ]

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
        throw new Error(payload.error ?? copy.pricing.error)
      }

      const payload = (await response.json()) as { checkoutUrl: string }
      window.location.href = payload.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.pricing.error)
    } finally {
      setLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--card)] shadow-xl" style={{ maxHeight: "90dvh" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{copy.pricing.title}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{copy.pricing.subtitle}</p>
          </div>
          <button
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
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

            let ctaLabel: string = plan.cta
            if (isActive) ctaLabel = copy.pricing.activePlan
            else if (isUpgrade) ctaLabel = copy.pricing.upgrade
            else if (isDowngrade) ctaLabel = copy.pricing.downgrade

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
                      ? "border-[var(--foreground)]"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                {/* Dark plan name header */}
                <div className="bg-[var(--primary)] px-4 py-3">
                  <p className="text-sm font-bold text-[var(--primary-foreground)]">{plan.name}</p>
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                  <p className="mb-3 text-xs text-[var(--muted-foreground)] line-clamp-2 min-h-[32px]">{plan.subtitle}</p>
                  <div className="mb-3 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <p className="text-2xl font-bold text-[var(--foreground)]">{plan.credits}</p>
                    <p className="text-xs text-[var(--muted-foreground)]/60">credits</p>
                  </div>
                  <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">{plan.price}</p>

                  <button
                    className={`mt-auto w-full rounded px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "cursor-default bg-[var(--secondary)] text-[var(--muted-foreground)]"
                        : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 disabled:opacity-60"
                    }`}
                    disabled={isLoading || isActive}
                    onClick={() => void handleSelectPlan(plan)}
                    type="button"
                  >
                    {isLoading ? copy.pricing.loading : ctaLabel}
                  </button>
                </div>
                </div>
              </div>
            )
          })}
        </div>

        {error ? (
          <div className="px-6 pb-4">
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
