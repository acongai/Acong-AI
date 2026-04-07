"use client"

import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { AppMessage } from "@/types"

interface MessageBubbleProps {
  index: number
  message: AppMessage
}

function formatMessageTime(value?: string) {
  if (!value) {
    return "Baru aja"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Baru aja"
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function MessageBubble({ index, message }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
      initial={{ opacity: 0, y: 14 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
    >
      <div
        className={cn(
          "max-w-[88%] px-4 py-3 text-[14px] leading-relaxed md:max-w-[75%]",
          isUser
            ? "rounded-md rounded-br-none bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)]"
            : "rounded-md rounded-tl-none border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm",
        )}
      >
        {message.attachments?.length ? (
          <div className="mb-3 grid gap-3">
            {message.attachments.map((attachment) => (
              <div
                className="overflow-hidden rounded-md border border-[var(--border)]"
                key={attachment.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={attachment.fileName ?? "Attachment"}
                  className="max-h-[360px] w-full object-cover"
                  src={attachment.url}
                />
              </div>
            ))}
          </div>
        ) : null}

        <p className="whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
        {formatMessageTime(message.createdAt)}
      </p>
    </motion.article>
  )
}
