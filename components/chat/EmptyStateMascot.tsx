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

interface EmptyStateMascotProps {
  className?: string
}

export function EmptyStateMascot({ className }: EmptyStateMascotProps) {
  const { activeCharacter, switchCharacter } = useCharacter()
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

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
    </div>
  )
}
