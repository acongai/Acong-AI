"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface OnboardingModalProps {
  userId: string
  onComplete: () => void
}

export function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState<"male" | "female" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

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
      
      toast.success("Siap! Selamat datang di Acong AI.")
      onComplete()
    } catch (err) {
      console.error("Onboarding error:", err)
      toast.error("Ada masalah pas nyimpen data lu. Coba lagi ya.")
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
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Kenalan Dulu Dong!</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Biar Acong, Mpok, ama Babeh manggilnya enak. Tenang, data lu aman.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">
              Nama Lengkap
            </label>
            <Input
              autoFocus
              placeholder="Masukkan namamu..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 border-[var(--border)] bg-[var(--secondary)]/30 px-4 text-base focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex h-12 items-center justify-center rounded-xl border px-4 transition-all ${
                  gender === "male"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md"
                    : "border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--foreground)] hover:bg-[var(--secondary)]/50"
                }`}
              >
                Laki-laki
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex h-12 items-center justify-center rounded-xl border px-4 transition-all ${
                  gender === "female"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md"
                    : "border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--foreground)] hover:bg-[var(--secondary)]/50"
                }`}
              >
                Perempuan
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="h-12 w-full rounded-xl text-base font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? "Lagi nyimpen..." : "Gas Terus!"}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
