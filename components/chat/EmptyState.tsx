"use client"

import { motion } from "framer-motion"
import { Bot } from "lucide-react"

interface EmptyStateProps {
  subtitle: string
  title: string
}

export function EmptyState({ subtitle, title }: EmptyStateProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-14 text-center"
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.28 }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-[#E4E4E4] bg-white shadow-sm"
        transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY }}
      >
        <Bot className="h-7 w-7 text-[#666666]" />
      </motion.div>
      <h2 className="max-w-md text-2xl font-semibold tracking-tight text-[#111111]">
        {title}
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#666666]">
        {subtitle}
      </p>
    </motion.div>
  )
}
