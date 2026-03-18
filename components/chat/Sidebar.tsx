"use client"

import { useEffect, useRef, useState } from "react"
import { LogOut, MessageSquarePlus, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { ThreadList } from "@/components/chat/ThreadList"
import { GradientButton } from "@/components/ui/gradient-button"
import { COPY } from "@/lib/copy"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/supabase/client"
import type { AppThread } from "@/types"

interface SidebarProps {
  activeThreadId?: string | null
  className?: string
  onDeleteThread?: (threadId: string) => Promise<void>
  onNavigate?: () => void
  onOpenLogin?: () => void
  threads: AppThread[]
  userName?: string | null
  planName?: string
}

export function Sidebar({
  activeThreadId,
  className,
  onDeleteThread,
  onNavigate,
  onOpenLogin,
  threads,
  userName,
  planName = "Ga Modal",
}: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function handleNewThread() {
    onNavigate?.()
    if (pathname === "/") {
      window.location.href = "/"
    } else {
      router.push("/")
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [accountMenuOpen])

  return (
    <aside className={className} data-slot="sidebar">
      <div className="flex h-full flex-col border-r border-[#E4E4E4] bg-white px-4 pb-4 pt-5">
        <div className="space-y-4">
          <div className="px-2 text-center">
            <p className="text-5xl tracking-tight text-[#111111]" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 800 }}>
              {COPY.brandName}
            </p>
          </div>

          <GradientButton
            className="h-9 w-full min-w-0 rounded-lg px-4 py-0 text-sm font-medium"
            onClick={handleNewThread}
            type="button"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            {COPY.sidebar.newThread}
          </GradientButton>
        </div>

        <ScrollArea className="mt-6 min-h-0 flex-1 overflow-x-hidden pr-1">
          <ThreadList
            activeThreadId={activeThreadId}
            onDeleteThread={onDeleteThread}
            onNavigate={onNavigate}
            threads={threads}
          />
        </ScrollArea>

        <div className="relative mt-4" ref={menuRef}>
          {userName ? (
            <>
              {accountMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-lg border border-[#E4E4E4] bg-white shadow-md">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#E5484D] transition-colors hover:bg-[#FFF5F5]"
                    onClick={handleSignOut}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}

              <button
                className="w-full rounded-lg border border-[#E4E4E4] p-3 text-left transition-colors hover:bg-[#F8F8F8]"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2]">
                    <User className="h-3.5 w-3.5 text-[#666666]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#111111]">
                      {userName}
                    </p>
                    <p className="text-[11px] text-[#999999]">{planName}</p>
                  </div>
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-[#999999] transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            </>
          ) : (
            <button
              className="w-full rounded-lg border border-[#E4E4E4] p-3 text-left transition-colors hover:bg-[#F8F8F8]"
              onClick={() => onOpenLogin?.()}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2]">
                  <User className="h-3.5 w-3.5 text-[#666666]" />
                </div>
                <p className="text-xs font-medium text-[#999999]">
                  {COPY.sidebar.loginButton}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
