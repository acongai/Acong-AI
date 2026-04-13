"use client"

import { useEffect, useRef, useState } from "react"
import { LogOut, MessageSquarePlus, User } from "lucide-react"
import { toast } from "sonner"
import { usePathname, useRouter } from "next/navigation"

import { ThreadList } from "@/components/chat/ThreadList"
import { GradientButton } from "@/components/ui/gradient-button"
import { useLanguage } from "@/hooks/useLanguage"
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
  userAvatarUrl?: string | null
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
  userAvatarUrl,
  planName = "Ga Modal",
}: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { copy } = useLanguage()
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(userName || "")

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
    window.location.href = "/"
  }

  async function handleRenameProfile() {
    if (!newName.trim() || newName === userName) {
      setIsRenaming(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: newName.trim() })
      .eq("id", user.id)

    if (error) {
      toast.error("Failed to rename profile")
    } else {
      window.dispatchEvent(new CustomEvent("acong:profile:updated"))
      setIsRenaming(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
        setIsRenaming(false)
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
      <div className="flex h-full flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] px-4 pb-4 pt-5">
        <div className="space-y-4">
          <div className="px-2 text-center text-[var(--foreground)]">
            <p className="text-5xl tracking-tight" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 800 }}>
              {copy.brandName}
            </p>
          </div>

          <GradientButton
            className="h-9 w-full min-w-0 rounded-lg px-4 py-0 text-sm font-medium"
            onClick={handleNewThread}
            type="button"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            {copy.sidebar.newThread}
          </GradientButton>
        </div>

        <ScrollArea className="mt-6 min-h-0 flex-1 overflow-x-hidden pr-1">
          <ThreadList
            activeThreadId={activeThreadId || undefined}
            onDeleteThread={onDeleteThread || (async () => {})}
            onNavigate={onNavigate || (() => {})}
            threads={threads}
          />
        </ScrollArea>

        <div className="relative mt-4" ref={menuRef}>
          {userName ? (
            <>
              {accountMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-md">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)]"
                    onClick={() => {
                      setIsRenaming(true)
                      setNewName(userName || "")
                    }}
                    type="button"
                  >
                    <User className="h-4 w-4" />
                    {copy.sidebar.renameProfile}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#E5484D] transition-colors hover:bg-[var(--sidebar-accent)]"
                    onClick={handleSignOut}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    {copy.sidebar.signOut}
                  </button>
                </div>
              )}

              <div className="w-full rounded-lg border border-[var(--sidebar-border)] p-3 text-left transition-colors hover:bg-[var(--sidebar-accent)]">
                {isRenaming ? (
                  <div className="flex flex-col gap-2">
                    <input
                      autoFocus
                      className="h-7 w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameProfile()
                        if (e.key === "Escape") setIsRenaming(false)
                      }}
                      value={newName}
                    />
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded bg-[var(--primary)] py-1 text-[10px] font-bold text-[var(--primary-foreground)]"
                        onClick={handleRenameProfile}
                      >
                        Save
                      </button>
                      <button
                        className="flex-1 rounded bg-[var(--secondary)] py-1 text-[10px] font-bold text-[var(--foreground)]"
                        onClick={() => setIsRenaming(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--sidebar-accent)]">
                        {userAvatarUrl ? (
                          <img alt={userName || "User"} className="h-full w-full object-cover" src={userAvatarUrl} />
                        ) : (
                          <User className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-medium text-[var(--sidebar-foreground)]">
                          {userName}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {planName === "Ga Modal" ? copy.sidebar.planFree : planName}
                        </p>
                      </div>
                      <svg
                        className={`h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                )}
              </div>
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
                    {copy.sidebar.loginButton}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
