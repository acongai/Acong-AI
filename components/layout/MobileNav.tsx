"use client"

import { MessageSquare, Plus, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface MobileNavProps {
  onOpenDrawer: () => void
  onOpenLogin: () => void
  isAuthenticated: boolean
  onOpenAccount: () => void
}

export function MobileNav({
  onOpenDrawer,
  onOpenLogin,
  isAuthenticated,
  onOpenAccount,
}: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isOnChat = pathname.startsWith("/chat/")

  function handleNewThread() {
    router.push("/")
  }

  function handleAccountPress() {
    if (isAuthenticated) {
      onOpenAccount()
    } else {
      onOpenLogin()
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4E4E4] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
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
          <User className="h-5 w-5 text-[#666666]" />
          <span className="text-[10px] text-[#666666]">Akun</span>
        </button>
      </div>
    </nav>
  )
}
