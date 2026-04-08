"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { MoreVertical, Trash2, MessageSquare, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCharacter } from "@/hooks/useCharacter"
import { useLanguage } from "@/hooks/useLanguage"
import type { AppThread } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ThreadListProps {
  activeThreadId?: string
  onDeleteThread: (id: string) => Promise<void>
  onNavigate: (id: string) => void
  threads: AppThread[]
}

function formatThreadTime(value: string, copy: any) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return copy.thread.justNow
  }

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / (1000 * 60)),
  )

  if (diffMinutes < 60) {
    return `${diffMinutes}m ${copy.thread.timeSuffix}`
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}j ${copy.thread.timeSuffix}`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}h ${copy.thread.timeSuffix}`
}

export function ThreadList({
  activeThreadId,
  onDeleteThread,
  onNavigate,
  threads,
}: ThreadListProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { characters } = useCharacter()
  const { copy } = useLanguage()

  async function handleConfirmDelete() {
    if (!pendingDeleteId || !onDeleteThread) return

    setIsDeleting(true)
    try {
      await onDeleteThread(pendingDeleteId)
    } finally {
      setIsDeleting(false)
      setPendingDeleteId(null)
    }
  }

  if (!threads.length) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--sidebar-border)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
        {copy.sidebar.emptyThreads}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {threads.map((thread, index) => {
          const active = activeThreadId === thread.id
          const isGroup = thread.type === "group"
          const memberIds = thread.metadata?.memberIds || []
          const characterId = isGroup ? null : (thread.metadata?.character_id || thread.metadata?.characterId || "acong")

          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 10 }}
              key={thread.id}
              transition={{ delay: index * 0.04, duration: 0.22 }}
              whileHover={{ scale: 1.01 }}
            >
              <Link
                className={cn(
                  "group block rounded-lg border px-3 py-2 transition-colors",
                  active
                    ? "border-[var(--sidebar-border)] border-l-2 border-l-[var(--primary)] bg-[var(--sidebar-accent)]"
                    : "border-[var(--sidebar-border)] bg-[var(--sidebar)] hover:bg-[var(--sidebar-accent)]",
                )}
                href={`/chat/${thread.id}`}
                onClick={() => onNavigate(thread.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8 shrink-0">
                    {isGroup ? (
                      <div className="flex -space-x-4">
                        {memberIds.slice(0, 3).map((id: string, i: number) => {
                          const char = characters.find(c => c.id === id)
                          return (
                            <div 
                              key={id}
                              className="h-7 w-7 overflow-hidden rounded-full border-2 border-[var(--sidebar)] bg-[var(--secondary)]"
                              style={{ zIndex: 10 - i }}
                            >
                              <Image src={char?.avatarSrc || "/images/ACONG BETE.png"} className="h-full w-full object-cover" alt="" width={28} height={28} />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-[var(--sidebar-accent)] shadow-sm">
                        <Image 
                          src={characters.find(c => c.id === characterId)?.avatarSrc || characters.find(c => c.id === "acong")?.avatarSrc || "/images/ACONG BETE.png"} 
                          className="h-full w-full object-cover" 
                          alt="" 
                          width={32}
                          height={32}
                        />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--sidebar-foreground)]">
                      {thread.title}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-[var(--muted-foreground)]">
                      {thread.preview}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[10px] text-[var(--muted-foreground)] opacity-60">
                      {formatThreadTime(thread.updatedAt, copy)}
                    </span>

                      <button
                        className="rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-all hover:text-[#E5484D] group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPendingDeleteId(thread.id)
                        }}
                        title={copy.thread.deleteTitle}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <Dialog 
        open={!!pendingDeleteId} 
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <DialogContent className="max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              {copy.thread.deleteTitle}
            </DialogTitle>
            <DialogDescription>
              {copy.thread.deleteConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDeleteId(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? copy.thread.deletingAction : copy.thread.deleteAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
