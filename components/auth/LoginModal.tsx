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
          <div className="hidden flex-col items-center justify-center gap-5 rounded-l-2xl bg-[#F2F2F2] p-10 text-center md:flex md:w-1/2">
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
          <div className="flex w-full flex-col items-center justify-center gap-5 rounded-2xl bg-white p-8 md:w-1/2 md:rounded-l-none md:rounded-r-2xl">

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

            <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>

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
