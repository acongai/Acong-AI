"use client"

import { motion } from "framer-motion"

export function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="rounded-md rounded-tl-none border border-[#E4E4E4] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              className="h-2 w-2 rounded-full bg-[#999999]"
              key={i}
              transition={{
                delay: i * 0.12,
                duration: 0.9,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
