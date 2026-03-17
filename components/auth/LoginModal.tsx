"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { COPY } from "@/lib/copy"
import {
  collectBrowserFingerprint,
  serializeFingerprintCookie,
  SIGNUP_FINGERPRINT_COOKIE,
} from "@/lib/utils/fingerprint"
import { createClient } from "@/supabase/client"

interface LoginModalProps {
  errorMessage?: string | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

function mapLoginError() {
  return COPY.dialogs.loginError
}

function mapSignupError(message: string) {
  if (message.toLowerCase().includes("already registered")) {
    return COPY.dialogs.signupExistsError
  }

  if (message.toLowerCase().includes("8 characters")) {
    return COPY.dialogs.signupInvalid
  }

  return COPY.dialogs.signupError
}

async function persistSignupFingerprint() {
  const payload = await collectBrowserFingerprint()
  const cookieValue = serializeFingerprintCookie(payload)
  const secure = window.location.protocol === "https:" ? "; Secure" : ""

  document.cookie = [
    `${SIGNUP_FINGERPRINT_COOKIE}=${cookieValue}`,
    "Path=/",
    "Max-Age=600",
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("; ")
}

async function persistSignupFingerprintSafely() {
  try {
    await persistSignupFingerprint()
  } catch (error) {
    console.warn("auth_fingerprint_capture_failed", {
      error,
    })
  }
}

export function LoginModal({
  errorMessage,
  onOpenChange,
  open,
}: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function reset() {
    setEmail("")
    setPassword("")
    setError(null)
    setShowPassword(false)
  }

  function switchMode(newMode: "login" | "signup") {
    setMode(newMode)
    setError(null)
  }

  function handleOpenChange(value: boolean) {
    if (!value) reset()
    onOpenChange(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      setError(null)
      try {
        const supabase = createClient()
        const trimmedEmail = email.trim().toLowerCase()

        if (mode === "login") {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })

          if (loginError) {
            setError(mapLoginError())
            return
          }

          reset()
          onOpenChange(false)
          router.refresh()
          return
        }

        await persistSignupFingerprintSafely()

        const signupResponse = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        })
        const signupPayload = (await signupResponse.json().catch(() => null)) as
          | {
              error?: string
            }
          | null

        if (!signupResponse.ok) {
          setError(signupPayload?.error ?? COPY.dialogs.signupError)
          return
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (loginError) {
          setError(COPY.dialogs.signupLoginError)
          return
        }

        reset()
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error
            ? mode === "login"
              ? mapLoginError()
              : mapSignupError(err.message)
            : COPY.dialogs.genericError,
        )
      }
    })
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
                {mode === "login" ? COPY.dialogs.loginTitle : COPY.dialogs.signupTitle}
              </DialogTitle>
              <DialogDescription className="text-xs leading-5 text-[#666666]">
                {mode === "login" ? COPY.dialogs.loginSubtitle : COPY.dialogs.signupSubtitle}
              </DialogDescription>
            </div>
          </div>

          {/* Right column — form */}
          <div className="w-full space-y-4 rounded-2xl bg-white p-8 md:w-3/5 md:rounded-l-none md:rounded-r-2xl">

            {/* Title visible on mobile only */}
            <div className="md:hidden">
              <DialogTitle className="text-lg font-semibold text-[#111111]">
                {mode === "login" ? COPY.dialogs.loginTitle : COPY.dialogs.signupTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 text-[#666666]">
                {mode === "login" ? COPY.dialogs.loginSubtitle : COPY.dialogs.signupSubtitle}
              </DialogDescription>
            </div>

            <div className="flex rounded border border-[#E4E4E4] p-0.5">
              <button
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-[#111111] text-white"
                    : "text-[#666666] hover:text-[#111111]"
                }`}
                onClick={() => switchMode("login")}
                type="button"
              >
                {COPY.dialogs.loginTabLabel}
              </button>
              <button
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "signup"
                    ? "bg-[#111111] text-white"
                    : "text-[#666666] hover:text-[#111111]"
                }`}
                onClick={() => switchMode("signup")}
                type="button"
              >
                {COPY.dialogs.signupTabLabel}
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                autoComplete="email"
                className="h-10 border-[#E4E4E4] text-[14px] text-[#111111] placeholder:text-[#999999] focus:border-[#111111] focus-visible:ring-0 outline-none"
                onChange={(e) => setEmail(e.target.value)}
                placeholder={COPY.dialogs.emailPlaceholder}
                required
                type="email"
                value={email}
              />

              <div className="relative">
                <Input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-10 border-[#E4E4E4] pr-10 text-[14px] text-[#111111] placeholder:text-[#999999] focus:border-[#111111] focus-visible:ring-0 outline-none"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={COPY.dialogs.passwordPlaceholder}
                  minLength={8}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111]"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {displayError ? (
                <p className="text-sm text-[#E5484D]">{displayError}</p>
              ) : null}

              <Button
                className="h-10 w-full bg-[#111111] text-sm text-white hover:bg-[#222222]"
                disabled={isPending}
                type="submit"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "login" ? COPY.dialogs.loginButton : COPY.dialogs.signupButton}
              </Button>
            </form>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
