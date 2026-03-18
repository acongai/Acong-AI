"use client"

import { useEffect, useRef, useState } from "react"
import { LogOut, MessageSquare, Plus, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { createClient } from "@/supabase/client"

interface MobileNavProps {
  onOpenDrawer: () => void
  onOpenLogin: () => void
  isAuthenticated: boolean
  onOpenAccount: () => void
  userEmail?: string | null
}

export function MobileNav({
  onOpenDrawer,
  onOpenLogin,
  isAuthenticated,
  userEmail,
}: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isOnChat = pathname.startsWith("/chat/")
  const [accountPopupOpen, setAccountPopupOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setAccountPopupOpen(false)
    router.push("/")
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setAccountPopupOpen(false)
      }
    }
    if (accountPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [accountPopupOpen])

  function handleNewThread() {
    router.push("/")
  }

  function handleAccountPress() {
    if (isAuthenticated) {
      setAccountPopupOpen((prev) => !prev)
    } else {
      onOpenLogin()
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4E4E4] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {accountPopupOpen && isAuthenticated && (
        <div
          ref={popupRef}
          className="absolute bottom-full right-0 mb-1 mr-2 w-56 overflow-hidden rounded-xl border border-[#E4E4E4] bg-white shadow-lg"
        >
          {userEmail && (
            <div className="border-b border-[#E4E4E4] px-4 py-3">
              <p className="truncate text-xs font-medium text-[#111111]">{userEmail}</p>
            </div>
          )}
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-[#E5484D] transition-colors hover:bg-[#FFF5F5] active:bg-[#FFF5F5]"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      )}

      <div className="flex h-14 items-center">
        <button
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          onClick={onOpenDrawer}
          type="button"
        >
          <MessageSquare
            className={`h-5 w-5 ${isOnChat ? "text-[#111111]" : "text-[#666666]"}`}
          />
          <span className={`text-[10px] ${isOnChat ? "text-[#111111]" : "text-[#666666]"}`}>
            Chat
          </span>
        </button>

        <button
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          onClick={handleNewThread}
          type="button"
        >
          <Plus
            className={`h-5 w-5 ${pathname === "/" ? "text-[#111111]" : "text-[#666666]"}`}
          />
          <span className={`text-[10px] ${pathname === "/" ? "text-[#111111]" : "text-[#666666]"}`}>
            Baru
          </span>
        </button>

        <button
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          onClick={handleAccountPress}
          type="button"
        >
          <User className={`h-5 w-5 ${isAuthenticated ? "text-[#111111]" : "text-[#666666]"}`} />
          <span className={`text-[10px] ${isAuthenticated ? "text-[#111111]" : "text-[#666666]"}`}>Akun</span>
        </button>
      </div>
    </nav>
  )
}
