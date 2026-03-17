"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion"

const MASCOTS = [
  { src: "/images/ACONG BETE.png",    alt: "Acong bete" },
  { src: "/images/ACONG MARAH.png",   alt: "Acong marah" },
  { src: "/images/ACONG NGAMBEK.png", alt: "Acong ngambek" },
]

interface EmptyStateMascotProps {
  className?: string
}

export function EmptyStateMascot({ className }: EmptyStateMascotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % MASCOTS.length)
    }, 10_000)
    return () => clearInterval(id)
  }, [])

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

  const current = MASCOTS[index]

  return (
    // perspective must be on parent, not the rotating element
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
  )
}
