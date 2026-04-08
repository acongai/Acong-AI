"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Trash2 } from "lucide-react"

import { useCharacter } from "@/hooks/useCharacter"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { COPY } from "@/lib/copy"
import { cn } from "@/lib/utils"
import type { AppThread } from "@/types"

interface ThreadListProps {
  activeThreadId?: string | null
  onDeleteThread?: (threadId: string) => Promise<void>
  onNavigate?: () => void
  threads: AppThread[]
}

function formatThreadTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return COPY.thread.justNow
  }

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / (1000 * 60)),
  )

  if (diffMinutes < 60) {
    return `${diffMinutes}m lalu`
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}j lalu`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}h lalu`
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
      <div className="rounded-lg border border-dashed border-[#E4E4E4] p-4 text-sm leading-6 text-[#999999]">
        {COPY.sidebar.emptyThreads}
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
                onClick={onNavigate}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8 shrink-0">
                    {isGroup ? (
                      <div className="flex -space-x-4">
                        {memberIds.slice(0, 3).map((id, i) => {
                          const char = characters.find(c => c.id === id)
                          return (
                            <div 
                              key={id}
                              className="h-7 w-7 overflow-hidden rounded-full border-2 border-[var(--sidebar)] bg-[var(--secondary)]"
                              style={{ zIndex: 10 - i }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={char?.avatarSrc} className="h-full w-full object-cover" alt="" />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-accent)] text-[var(--muted-foreground)] opacity-70">
                        <span className="text-sm">💬</span>
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
                    <span className="text-[11px] text-[#BBBBBB]">
                      {formatThreadTime(thread.updatedAt)}
                    </span>

                    {onDeleteThread && (
                      <button
                        className="rounded p-0.5 text-[#CCCCCC] opacity-0 transition-all hover:text-[#E5484D] group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPendingDeleteId(thread.id)
                        }}
                        title="Hapus chat"
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        open={pendingDeleteId !== null}
      >
        <DialogContent className="border-[#E4E4E4] bg-white text-[#111111] sm:max-w-sm" showCloseButton={false}>
          <DialogTitle className="text-base font-semibold text-[#111111]">
            Yakin mau hapus chat ini?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#666666]">
            Chat ini bakal ilang selamanya. Acong pun gak bisa bantu kalau udah gitu.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="h-9 rounded border border-[#E4E4E4] px-4 text-sm text-[#666666] transition-colors hover:bg-[#F8F8F8]"
              disabled={isDeleting}
              onClick={() => setPendingDeleteId(null)}
              type="button"
            >
              Batal
            </button>
            <button
              className="h-9 rounded bg-[#E5484D] px-4 text-sm font-medium text-white transition-colors hover:bg-[#C93B3F] disabled:opacity-60"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              type="button"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
