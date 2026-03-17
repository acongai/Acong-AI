"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { COPY } from "@/lib/copy"
import { createClient } from "@/supabase/client"

interface LoginModalProps {
  errorMessage?: string | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function LoginModal({
  errorMessage,
  onOpenChange,
  open,
}: LoginModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(value: boolean) {
    if (!value) setError(null)
    onOpenChange(value)
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError(COPY.dialogs.googleError)
        setLoading(false)
      }
    } catch {
      setError(COPY.dialogs.googleError)
      setLoading(false)
    }
  }

  const displayError = error ?? (open ? errorMessage : null)

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-[#E4E4E4] p-0 text-[#111111] sm:max-w-3xl">
        <div className="flex flex-col md:flex-row">

          {/* Left column — mascot + copy */}
          <div className="hidden flex-col items-center justify-center gap-5 rounded-l-2xl bg-[#F2F2F2] p-10 text-center md:flex md:w-2/5">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-32 w-32 rounded-full bg-gray-400 opacity-20 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Acong"
                className="relative object-contain"
                height={160}
                src="/images/ACONG BETE.png"
                width={160}
              />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-lg font-semibold leading-snug text-[#111111]">
                {COPY.dialogs.loginTitle}
              </DialogTitle>
              <DialogDescription className="text-xs leading-5 text-[#666666]">
                {COPY.dialogs.loginSubtitle}
              </DialogDescription>
            </div>
          </div>

          {/* Right column — Google login */}
          <div className="flex w-full flex-col items-center justify-center gap-5 rounded-2xl bg-white p-8 md:w-3/5 md:rounded-l-none md:rounded-r-2xl">

            {/* Title visible on mobile only */}
            <div className="w-full md:hidden">
              <DialogTitle className="text-lg font-semibold text-[#111111]">
                {COPY.dialogs.loginTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 text-[#666666]">
                {COPY.dialogs.loginSubtitle}
              </DialogDescription>
            </div>

            {displayError ? (
              <p className="w-full text-sm text-[#E5484D]">{displayError}</p>
            ) : null}

            <Button
              className="h-10 w-full bg-[#111111] text-sm text-white hover:bg-[#222222]"
              disabled={loading}
              onClick={handleGoogleLogin}
              type="button"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {COPY.dialogs.googleButton}
            </Button>

          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
