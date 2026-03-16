"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { Sidebar } from "@/components/chat/Sidebar"
import { MobileDrawer } from "@/components/layout/MobileDrawer"
import { CreditBadge } from "@/components/payments/CreditBadge"
import { Button } from "@/components/ui/button"
import { useCredits } from "@/hooks/useCredits"
import { useThread } from "@/hooks/useThread"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const credits = useCredits()

  const activeThreadId = pathname.startsWith("/chat/")
    ? pathname.split("/").at(-1) ?? null
    : null
  const threadState = useThread({
    includeMessages: false,
    threadId: activeThreadId ?? undefined,
  })

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#111111]">
      <Sidebar
        activeThreadId={activeThreadId}
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] md:block"
        threads={threadState.threads}
      />

      <MobileDrawer onOpenChange={setDrawerOpen} open={drawerOpen}>
        <Sidebar
          activeThreadId={activeThreadId}
          className="h-full"
          onNavigate={() => setDrawerOpen(false)}
          threads={threadState.threads}
        />
      </MobileDrawer>

      <div className="min-h-screen md:pl-[260px]">
        <header className="sticky top-0 z-20 h-14 border-b border-[#E4E4E4] bg-white">
          <div className="flex h-full items-center justify-between px-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-3">
              <Button
                className="h-9 w-9 rounded border border-[#E4E4E4] bg-white text-[#111111] hover:bg-[#F8F8F8] md:hidden"
                onClick={() => setDrawerOpen(true)}
                size="icon"
                variant="ghost"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <p className="text-sm font-semibold text-[#111111]">ACONG</p>
            </div>

            <div className="flex items-center gap-3">
              <CreditBadge
                balance={credits.balance}
                error={credits.error}
                isLoading={credits.isLoading}
                lowCredits={credits.lowCredits}
              />
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}
