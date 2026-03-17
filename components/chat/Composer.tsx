"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { RotateCcw, SendHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CreditBadge } from "@/components/payments/CreditBadge"
import { COPY } from "@/lib/copy"
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
  const credits = useCredits()
  const handleCreditDeducted = useEffectEvent(() => {
    credits.refresh()
  })

  useEffect(() => {
    const handler = () => handleCreditDeducted()
    window.addEventListener("acong:credit:deducted", handler)
    return () => window.removeEventListener("acong:credit:deducted", handler)
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

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
            void onSubmit(value)
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
            className="h-8 rounded px-3 text-xs text-[#666666] hover:bg-[#F8F8F8] hover:text-[#111111]"
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
          />

          <Button
            className="h-8 w-8 rounded bg-[#111111] text-white hover:bg-[#222222]"
            disabled={!canSend}
            onClick={() => {
              void onSubmit(value)
            }}
            size="icon"
            title={COPY.composer.sendLabel}
            type="button"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
    </div>
  )

  if (variant === "centered") {
    return <div className="w-full">{box}</div>
  }

  return (
    <div className="sticky bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {box}
      </div>
    </div>
  )
}
