"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/useLanguage"

interface OnboardingModalProps {
  userId: string
  onComplete: () => void
}

export function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState<"male" | "female" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const { copy } = useLanguage()

  const isValid = fullName.trim().length >= 2 && gender !== null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName.trim(), 
          gender 
        })
        .eq("id", userId)

      if (error) throw error
      
      toast.success(copy.onboarding.success)
      onComplete()
    } catch (err) {
      console.error("Onboarding error:", err)
      toast.error(copy.onboarding.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{copy.onboarding.title}</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {copy.onboarding.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">
              {copy.onboarding.nameLabel}
            </label>
            <Input
              autoFocus
              placeholder={copy.onboarding.namePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 border-[var(--border)] bg-[var(--secondary)]/30 px-4 text-base focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">
              {copy.onboarding.genderLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex h-12 items-center justify-center rounded-xl border px-4 transition-all ${
                  gender === "male"
                    ? "border-white bg-white text-black shadow-md"
                    : "border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--foreground)] hover:bg-[var(--secondary)]/50"
                }`}
              >
                {copy.onboarding.genderMale}
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex h-12 items-center justify-center rounded-xl border px-4 transition-all ${
                  gender === "female"
                    ? "border-white bg-white text-black shadow-md"
                    : "border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--foreground)] hover:bg-[var(--secondary)]/50"
                }`}
              >
                {copy.onboarding.genderFemale}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="h-12 w-full rounded-xl text-base font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? copy.onboarding.submittingLabel : copy.onboarding.submitLabel}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
