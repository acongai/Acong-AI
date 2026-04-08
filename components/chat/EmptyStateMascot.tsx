"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCharacter } from "@/hooks/useCharacter"

import { createClient } from "@/supabase/client"
import { toast } from "sonner"
import { Check, Edit3, X as CloseIcon } from "lucide-react"

interface EmptyStateMascotProps {
  className?: string
  thread?: any
  threadId?: string
}

export function EmptyStateMascot({ className, thread, threadId }: EmptyStateMascotProps) {
  const { characters, activeCharacter, switchCharacter } = useCharacter()
  const ref = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const [index, setIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [newTitle, setNewTitle] = useState(thread?.threadTitle || "")
  
  const isGroup = thread?.type === "group"
  const memberIds = thread?.metadata?.memberIds || []
  const kickedIds = thread?.metadata?.kickedIds || []

  useEffect(() => {
    setNewTitle(thread?.threadTitle || "")
  }, [thread?.threadTitle])

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus()
  }, [isEditing])

  const handleRename = async () => {
    if (!newTitle.trim() || newTitle === thread?.threadTitle || !threadId) {
      setIsEditing(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("chat_threads")
      .update({ title: newTitle.trim() })
      .eq("id", threadId)

    if (error) {
      toast.error("Failed to rename group")
    } else {
      window.dispatchEvent(new CustomEvent("acong:threads:refresh"))
      await thread?.refresh?.()
      setIsEditing(false)
    }
  }

  // Reset index when character changes
  useEffect(() => {
    setIndex(0)
  }, [activeCharacter.id])

  useEffect(() => {
    if (activeCharacter.mascots.length <= 1) return
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % activeCharacter.mascots.length)
    }, 10_000)
    return () => clearInterval(id)
  }, [activeCharacter.mascots.length])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [8, -8]), {
    stiffness: 120,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-8, 8]), {
    stiffness: 120,
    damping: 20,
  })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set((e.clientX - centerX) / (rect.width / 2))
    mouseY.set((e.clientY - centerY) / (rect.height / 2))
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  const current = activeCharacter.mascots[index] || activeCharacter.mascots[0]

  return (
    <div className="flex flex-col items-center">
      {isGroup ? (
        <div className="flex flex-col items-center">
          {/* Group Mascot Overlap */}
          <div className="relative mb-6 flex h-32 w-48 items-center justify-center">
            {memberIds.includes('mpok') && (
              <div className="absolute left-0 bottom-0 z-10 h-20 w-20 -rotate-12 transform overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--card)] shadow-lg transition-transform hover:scale-110">
                <img src={characters.find(c => c.id === 'mpok')?.avatarSrc} className="h-full w-full object-cover" alt="Mpok" />
              </div>
            )}
            {memberIds.includes('acong') && (
              <div className="absolute left-1/2 top-0 z-30 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--card)] shadow-xl transition-transform hover:scale-110">
                <img src={characters.find(c => c.id === 'acong')?.avatarSrc} className="h-full w-full object-cover" alt="Acong" />
              </div>
            )}
            {memberIds.includes('babeh') && (
              <div className="absolute right-0 bottom-0 z-20 h-20 w-20 rotate-12 transform overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--card)] shadow-lg transition-transform hover:scale-110">
                <img src={characters.find(c => c.id === 'babeh')?.avatarSrc} className="h-full w-full object-cover" alt="Babeh" />
              </div>
            )}
          </div>
          
          {/* Editable Group Title */}
          <div className="flex items-center justify-center">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  ref={editInputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setIsEditing(false)
                  }}
                  className="h-9 rounded border border-[var(--border)] bg-[var(--background)] px-3 text-lg font-bold text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-center"
                />
                <button onClick={handleRename} className="p-2 text-green-500 hover:text-green-600">
                  <Check className="h-5 w-5" />
                </button>
                <button onClick={() => setIsEditing(false)} className="p-2 text-red-500 hover:text-red-600">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div 
                className="group flex cursor-pointer items-center gap-2"
                onClick={() => setIsEditing(true)}
              >
                <h1 className="text-lg font-semibold tracking-wide text-[var(--foreground)] uppercase">{thread?.threadTitle}</h1>
                <Edit3 className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* mascot container */}
          <div
            className={className}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            ref={ref}
            style={{ perspective: 600 }}
          >
            {/* rotation layer */}
            <motion.div style={{ rotateX, rotateY }}>
              {/* idle float layer */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                className="relative flex items-center justify-center"
                transition={{
                  duration: 4,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              >
                {/* glow */}
                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300 opacity-30 blur-2xl" />

                {/* image — hard cut on index change */}
                <div style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.10))" }}>
                  <Image
                    alt={current.alt}
                    className="h-[200px] w-[200px] object-contain md:h-[260px] md:w-[260px]"
                    height={260}
                    priority
                    src={current.src}
                    width={260}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Switcher UI */}
          <div className="mt-6 flex items-center gap-4">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-background text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]"
              onClick={() => switchCharacter("prev")}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold tracking-wide text-[var(--foreground)] uppercase">
              {activeCharacter.name}
            </span>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-background text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]"
              onClick={() => switchCharacter("next")}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
