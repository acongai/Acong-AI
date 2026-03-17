"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { RotateCcw, SendHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CreditBadge } from "@/components/payments/CreditBadge"
import { PricingPopup } from "@/components/payments/PricingPopup"
import { COPY } from "@/lib/copy"
import { useAuth } from "@/hooks/useAuth"
import { useCredits } from "@/hooks/useCredits"

interface ComposerProps {
  disabled?: boolean
  isSubmitting?: boolean
  onRegenerate?: () => void
  onSubmit: (value: string) => void | Promise<void>
  onValueChange: (value: string) => void
  regenerateDisabled?: boolean
  value: string
  variant?: "default" | "centered"
}

export function Composer({
  disabled = false,
  isSubmitting = false,
  onRegenerate,
  onSubmit,
  onValueChange,
  regenerateDisabled = false,
  value,
  variant = "default",
}: ComposerProps) {
  const canSend = value.trim().length > 0 && !disabled && !isSubmitting
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pricingOpen, setPricingOpen] = useState(false)
  const auth = useAuth()
  const credits = useCredits()
  const handleCreditDeducted = useEffectEvent(() => {
    credits.refresh()
  })

  const focusTextarea = () => {
    // Only auto-focus on desktop — don't pop keyboard on mobile
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      textareaRef.current?.focus()
    }
  }

  useEffect(() => {
    const handler = () => handleCreditDeducted()
    window.addEventListener("acong:credit:deducted", handler)
    return () => window.removeEventListener("acong:credit:deducted", handler)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  // Refocus textarea when AI finishes generating (desktop only)
  useEffect(() => {
    if (!isSubmitting) {
      focusTextarea()
    }
  }, [isSubmitting])

  async function handleSubmit(val: string) {
    await onSubmit(val)
    focusTextarea()
  }

  const box = (
    <div className="composer-glow relative z-0 rounded-xl">
    <div className="rounded-xl border border-[#E4E4E4] bg-white shadow-sm">
      <Textarea
        className="min-h-[44px] resize-none border-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-[#111111] placeholder:text-[#999999] focus-visible:ring-0"
        disabled={disabled || isSubmitting}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void handleSubmit(value)
          }
        }}
        placeholder={COPY.composer.placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      <div className="flex items-center justify-between gap-2 border-t border-[#EEEEEE] px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            className="h-8 min-h-[44px] rounded px-3 text-xs text-[#666666] hover:bg-[#F8F8F8] hover:text-[#111111]"
            disabled={regenerateDisabled}
            onClick={onRegenerate}
            type="button"
            variant="ghost"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {COPY.regenerateLabel}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <CreditBadge
            balance={credits.balance}
            error={credits.error}
            isLoading={credits.isLoading}
            lowCredits={credits.lowCredits}
            onClick={() => setPricingOpen(true)}
          />

          <button
            className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white text-[#111111] shadow-sm transition-colors duration-150 hover:bg-[#f0f0f0] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSend}
            onClick={() => void handleSubmit(value)}
            title={COPY.composer.sendLabel}
            type="button"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    </div>
  )

  const pricingPopup = (
    <PricingPopup
      isAuthenticated={auth.isAuthenticated}
      isOpen={pricingOpen}
      mode="manage"
      onClose={() => setPricingOpen(false)}
      onPlanSelected={credits.refresh}
    />
  )

  if (variant === "centered") {
    return (
      <>
        <div className="w-full">{box}</div>
        {pricingPopup}
      </>
    )
  }

  return (
    <>
      <div className="sticky bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {box}
        </div>
      </div>
      {pricingPopup}
    </>
  )
}
