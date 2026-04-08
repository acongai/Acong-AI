"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { RotateCcw, SendHorizontal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CreditBadge } from "@/components/payments/CreditBadge"
import { PricingPopup } from "@/components/payments/PricingPopup"
import { useAuth } from "@/hooks/useAuth"
import { useCredits } from "@/hooks/useCredits"
import { useLanguage } from "@/hooks/useLanguage"
import { useCharacter } from "@/hooks/useCharacter"

interface ComposerProps {
  disabled?: boolean
  isSubmitting?: boolean
  onRegenerate?: () => void
  onSubmit: (value: string) => void | Promise<void>
  onValueChange: (value: string) => void
  regenerateDisabled?: boolean
  value: string
  variant?: "default" | "centered"
  kickedIds?: string[]
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
  kickedIds = [],
}: ComposerProps) {
  const canSend = value.trim().length > 0 && !disabled && !isSubmitting
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const auth = useAuth()
  const credits = useCredits()
  const { copy } = useLanguage()
  const { characters } = useCharacter()
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <Textarea
        className="min-h-[44px] resize-none border-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:ring-0"
        disabled={disabled || isSubmitting}
        onChange={(event) => {
          const val = event.target.value
          onValueChange(val)
          
          // Basic mention detection for autocomplete
          const lastWord = val.split(/\s/).pop() || ""
          if (lastWord.startsWith("@")) {
            setMentionQuery(lastWord.slice(1).toLowerCase())
            setShowMentions(true)
          } else {
            setShowMentions(false)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void handleSubmit(value)
          }
        }}
        placeholder={copy.composer.placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      {/* Mention Suggestions Popup */}
      <AnimatePresence>
        {showMentions && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 mb-2 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
          >
            {characters
              .filter(c => !kickedIds.includes(c.id))
              .filter(c => c.name.toLowerCase().includes(mentionQuery))
              .map(char => (
                <button
                  key={char.id}
                  onClick={() => {
                    const parts = value.split(/\s/)
                    parts.pop() // remove the @query
                    const newVal = [...parts, `@${char.name} `].join(" ")
                    onValueChange(newVal)
                    setShowMentions(false)
                    textareaRef.current?.focus()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--secondary)]"
                >
                  <img src={char.avatarSrc} className="h-5 w-5 rounded-full object-cover" alt="" />
                  {char.name}
                </button>
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            className="h-8 min-h-[44px] rounded px-3 text-xs text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            disabled={regenerateDisabled}
            onClick={onRegenerate}
            type="button"
            variant="ghost"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {copy.composer.regenerateLabel}
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
            className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center text-[var(--foreground)] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 md:rounded-full md:bg-[var(--card)] md:shadow-sm md:hover:bg-[var(--secondary)]"
            disabled={!canSend}
            onClick={() => void handleSubmit(value)}
            title={copy.composer.sendLabel}
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
