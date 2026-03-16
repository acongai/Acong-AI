"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { COPY } from "@/lib/copy"

interface TypingIndicatorProps {
  label?: string
}

export function TypingIndicator({
  label,
}: TypingIndicatorProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (label) {
      return
    }

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % COPY.loadingMessages.length)
    }, 1400)

    return () => {
      window.clearInterval(interval)
    }
  }, [label])

  return (
    <div className="flex items-start">
      <div className="rounded-md rounded-tl-none border border-[#E4E4E4] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((index) => (
              <motion.span
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                className="h-2 w-2 rounded-full bg-[#999999]"
                key={index}
                transition={{
                  delay: index * 0.12,
                  duration: 0.9,
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-[#666666]">
            {label ?? COPY.loadingMessages[index]}
          </span>
        </div>
      </div>
    </div>
  )
}
