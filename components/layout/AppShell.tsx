"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Moon, Sun } from "lucide-react"

import { Sidebar } from "@/components/chat/Sidebar"
import { MobileDrawer } from "@/components/layout/MobileDrawer"
import { MobileNav } from "@/components/layout/MobileNav"
import { PricingPopup } from "@/components/payments/PricingPopup"
import { useAuth } from "@/hooks/useAuth"
import { useThread } from "@/hooks/useThread"
import { useLanguage } from "@/hooks/useLanguage"
import { useTheme } from "@/hooks/useTheme"
import { COPY } from "@/lib/copy"
import { createClient } from "@/supabase/client"

const LoginModal = dynamic(
  () => import("@/components/auth/LoginModal").then((m) => m.LoginModal),
  { ssr: false },
)

const ConsentModal = dynamic(
  () => import("@/components/auth/ConsentModal").then((m) => m.ConsentModal),
  { ssr: false },
)

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentUserId, setConsentUserId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const { locale, setLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const PLAN_LABELS: Record<string, string> = {
    free: "Ga Modal",
    basic: "Miskin",
    pro: "Ga miskin-miskin amat",
  }
  const planName = PLAN_LABELS[auth.currentPlan ?? "free"] ?? "Ga Modal"

  const activeThreadId = pathname.startsWith("/chat/")
    ? pathname.split("/").at(-1) ?? null
    : null
  const threadState = useThread({
    includeMessages: false,
    threadId: activeThreadId ?? undefined,
  })
  const previousAuthUserIdRef = useRef<string | null | undefined>(undefined)
  const authError = searchParams.get("auth_error")
  const loginRequestedFromUrl =
    searchParams.get("login") === "1" || Boolean(authError)
  const refreshThreads = useEffectEvent(() => {
    void threadState.refresh()
  })
  const openLogin = useEffectEvent(() => {
    setLoginOpen(true)
  })

  function showPricingIfNeeded() {
    if (!sessionStorage.getItem("pricing_shown")) {
      sessionStorage.setItem("pricing_shown", "1")
      setPricingOpen(true)
    }
  }

  const checkConsent = useEffectEvent(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("has_consented")
      .eq("id", userId)
      .single()

    if (!data?.has_consented) {
      setConsentUserId(userId)
      setConsentOpen(true)
    } else {
      showPricingIfNeeded()
    }
  })

  function handleConsented() {
    setConsentOpen(false)
    setConsentUserId(null)
    showPricingIfNeeded()
  }

  function handleDeclined() {
    setConsentOpen(false)
    setConsentUserId(null)
  }

  // Listen for ChatShell to request the login popup (e.g. on 401)
  useEffect(() => {
    const handler = () => openLogin()
    window.addEventListener("acong:login:open", handler)
    return () => window.removeEventListener("acong:login:open", handler)
  }, [])

  useEffect(() => {
    if (auth.isLoading) {
      return
    }

    const currentUserId = auth.user?.id ?? null

    if (previousAuthUserIdRef.current === undefined) {
      previousAuthUserIdRef.current = currentUserId

      if (currentUserId) {
        void checkConsent(currentUserId)
        refreshThreads()
      }

      return
    }

    if (previousAuthUserIdRef.current !== currentUserId) {
      // User just logged in (was null, now has id) — check consent first
      if (!previousAuthUserIdRef.current && currentUserId) {
        void checkConsent(currentUserId)
      }

      previousAuthUserIdRef.current = currentUserId
      refreshThreads()
    }
  }, [auth.isLoading, auth.user?.id])

  function clearAuthSearchParams() {
    const nextParams = new URLSearchParams(searchParams.toString())
    const trackedKeys = ["auth_error", "login"]
    const hadTrackedKeys = trackedKeys.some((key) => nextParams.has(key))

    if (!hadTrackedKeys) {
      return
    }

    trackedKeys.forEach((key) => nextParams.delete(key))

    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }

  function handleLoginOpenChange(open: boolean) {
    setLoginOpen(open)
    if (!open) {
      clearAuthSearchParams()
      window.dispatchEvent(new CustomEvent("acong:login:closed"))
    }
  }

  return (
    <div className="m-2 min-h-[calc(100vh-1rem)] overflow-hidden rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)]">
      <Sidebar
        activeThreadId={activeThreadId}
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] md:block border-r border-[var(--border)]"
        onDeleteThread={threadState.deleteThread}
        onOpenLogin={() => setLoginOpen(true)}
        planName={planName}
        threads={threadState.threads}
        userName={auth.user?.email ?? null}
        userAvatarUrl={(auth.user?.user_metadata?.avatar_url as string) ?? null}
      />

      <MobileDrawer onOpenChange={setDrawerOpen} open={drawerOpen}>
        <Sidebar
          activeThreadId={activeThreadId}
          className="h-full"
          onDeleteThread={threadState.deleteThread}
          onNavigate={() => setDrawerOpen(false)}
          onOpenLogin={() => setLoginOpen(true)}
          planName={planName}
          threads={threadState.threads}
          userName={auth.user?.email ?? null}
          userAvatarUrl={(auth.user?.user_metadata?.avatar_url as string) ?? null}
        />
      </MobileDrawer>

      <div className="relative h-[calc(100vh-1rem)] overflow-hidden pb-14 md:pb-0 md:pl-[260px]">
        {/* Language & Theme Toggles */}
        <div className="absolute right-6 top-5 z-20 flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <div className="flex gap-1.5 text-[10px] font-bold text-[var(--muted-foreground)]">
            <button 
              onClick={() => setLocale("id")}
              className={`transition-colors hover:text-[var(--foreground)] ${locale === "id" ? "text-[var(--foreground)] underline underline-offset-4" : ""}`}
            >
              ID
            </button>
            <span className="opacity-30">/</span>
            <button 
              onClick={() => setLocale("en")}
              className={`transition-colors hover:text-[var(--foreground)] ${locale === "en" ? "text-[var(--foreground)] underline underline-offset-4" : ""}`}
            >
              EN
            </button>
          </div>
        </div>

        <main className="h-full">{children}</main>
      </div>

      <MobileNav
        isAuthenticated={Boolean(auth.user)}
        onOpenAccount={() => {}}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenLogin={() => setLoginOpen(true)}
        userEmail={auth.user?.email ?? null}
      />

      {consentUserId ? (
        <ConsentModal
          onConsented={handleConsented}
          onDeclined={handleDeclined}
          open={consentOpen}
          userId={consentUserId}
        />
      ) : null}

      <LoginModal
        errorMessage={authError ? COPY.dialogs.oauthError : null}
        onOpenChange={handleLoginOpenChange}
        open={loginOpen || loginRequestedFromUrl}
      />

      <PricingPopup
        isAuthenticated={auth.isAuthenticated}
        isOpen={pricingOpen}
        mode="onboarding"
        onClose={() => setPricingOpen(false)}
      />
    </div>
  )
}
