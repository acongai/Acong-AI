"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { COPY } from "@/lib/copy"
import {
  collectBrowserFingerprint,
  serializeFingerprintCookie,
  SIGNUP_FINGERPRINT_COOKIE,
} from "@/lib/utils/fingerprint"
import { createClient } from "@/supabase/client"

function setFingerprintCookie(serialized: string) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:"
  const parts = [
    `${SIGNUP_FINGERPRINT_COOKIE}=${serialized}`,
    "Path=/",
    "Max-Age=3600",
    "SameSite=Lax",
  ]

  if (secure) {
    parts.push("Secure")
  }

  document.cookie = parts.join("; ")
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get("error") === "magic_link_failed") {
      setErrorMessage(COPY.loginPage.magicLinkFailed)
    }
  }, [])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        setErrorMessage(null)
        setStatusMessage(null)

        const supabase = createClient()
        const fingerprint = await collectBrowserFingerprint()
        setFingerprintCookie(serializeFingerprintCookie(fingerprint))

        const origin = window.location.origin
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        })

        if (error) {
          throw error
        }

        setStatusMessage(
          COPY.loginPage.magicLinkSent,
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : COPY.loginPage.genericError

        setErrorMessage(message)
      }
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F2F2F2] px-4 py-10">
      <Card className="relative z-10 w-full max-w-md border-[#E4E4E4] bg-white shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-[#E4E4E4] bg-[#F8F8F8]">
            <Mail className="h-4 w-4 text-[#666666]" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[#999999]">
              {COPY.loginPage.kicker}
            </p>
            <CardTitle className="text-2xl font-semibold tracking-tight text-[#111111]">
              {COPY.loginTitle}
            </CardTitle>
          </div>
          <p className="text-sm leading-6 text-[#666666]">
            {COPY.loginSubtitle}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoComplete="email"
              className="h-10 rounded border border-[#E4E4E4] bg-white text-[14px] text-[#111111] placeholder:text-[#999999] focus:border-[#111111] focus-visible:ring-0 outline-none"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={COPY.loginPage.emailPlaceholder}
              required
              type="email"
              value={email}
            />
            <Button
              className="h-10 w-full rounded bg-[#111111] text-sm text-white hover:bg-[#222222]"
              disabled={isPending}
              type="submit"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {COPY.loginPage.submitting}
                </>
              ) : (
                COPY.loginCTA
              )}
            </Button>
          </form>

          {statusMessage ? (
            <p className="mt-4 text-sm text-[#30A46C]">
              {statusMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 text-sm text-[#E5484D]">
              {errorMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
