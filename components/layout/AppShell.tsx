"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Sidebar } from "@/components/chat/Sidebar"
import { MobileDrawer } from "@/components/layout/MobileDrawer"
import { MobileNav } from "@/components/layout/MobileNav"
import { PricingPopup } from "@/components/payments/PricingPopup"
import { useAuth } from "@/hooks/useAuth"
import { useThread } from "@/hooks/useThread"
import { COPY } from "@/lib/copy"

const LoginModal = dynamic(
  () => import("@/components/auth/LoginModal").then((m) => m.LoginModal),
  { ssr: false },
)

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()

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
        refreshThreads()
      }

      return
    }

    if (previousAuthUserIdRef.current !== currentUserId) {
      // User just logged in (was null, now has id) — show pricing popup once per session
      if (!previousAuthUserIdRef.current && currentUserId) {
        if (!sessionStorage.getItem("pricing_shown")) {
          sessionStorage.setItem("pricing_shown", "1")
          setPricingOpen(true)
        }
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
    <div className="m-2 min-h-[calc(100vh-1rem)] overflow-hidden rounded-2xl bg-[#F2F2F2] text-[#111111]">
      <Sidebar
        activeThreadId={activeThreadId}
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] md:block"
        onDeleteThread={threadState.deleteThread}
        onOpenLogin={() => setLoginOpen(true)}
        planName={planName}
        threads={threadState.threads}
        userName={auth.user?.email ?? null}
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
        />
      </MobileDrawer>

      <div className="h-[calc(100vh-1rem)] overflow-hidden pb-14 md:pb-0 md:pl-[260px]">
        <main className="h-full">{children}</main>
      </div>

      <MobileNav
        isAuthenticated={Boolean(auth.user)}
        onOpenAccount={() => setLoginOpen(true)}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenLogin={() => setLoginOpen(true)}
      />

      <LoginModal
        errorMessage={authError ? COPY.dialogs.oauthError : null}
        onOpenChange={handleLoginOpenChange}
        open={loginOpen || loginRequestedFromUrl}
      />

      <PricingPopup
        isAuthenticated={true}
        isOpen={pricingOpen}
        mode="onboarding"
        onClose={() => setPricingOpen(false)}
      />
    </div>
  )
}
