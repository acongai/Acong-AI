"use client"

import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { AppMessage } from "@/types"

import { useCharacter } from "@/hooks/useCharacter"

import { useAuth } from "@/hooks/useAuth"

interface MessageBubbleProps {
  index: number
  message: AppMessage
}

function formatMessageTime(value?: string) {
  if (!value) return "Baru aja"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Baru aja"
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/** Renders message content with @mentions highlighted in blue */
function ContentWithMentions({ content }: { content: string }) {
  const { characters } = useCharacter()
  const charNames = characters.map(c => c.name)
  
  // Create regex pattern for @Name (case insensitive)
  const pattern = new RegExp(`@(${charNames.join("|")})`, "gi")
  
  const parts = content.split(pattern)
  const matches = [...content.matchAll(pattern)]
  
  let result: React.ReactNode[] = []
  let matchIdx = 0
  
  // Reconstruct parts with spans for mentions
  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i])
    if (matchIdx < matches.length) {
      const fullMatch = matches[matchIdx][0]
      result.push(
        <span key={`mention-${matchIdx}`} className="font-bold text-blue-500">
          {fullMatch}
        </span>
      )
      matchIdx++
    }
  }

  return <p className="whitespace-pre-wrap">{result}</p>
}

export function MessageBubble({ index, message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const { characters } = useCharacter()
  const auth = useAuth()
  
  const characterId = message.metadata?.character_id
  const character = characters.find((c) => c.id === characterId)
  const displayName = character?.name || "Acong"
  
  const userAvatar = auth.user?.user_metadata?.avatar_url
  const charAvatar = character?.avatarSrc

  if (isSystem) {
    return (
      <div className="my-4 flex justify-center">
        <p className="rounded-full bg-[var(--secondary)] px-4 py-1 text-[11px] text-[var(--muted-foreground)]">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      initial={{ opacity: 0, y: 14 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
    >
      {/* Avatar */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--secondary)] shadow-sm">
        {isUser ? (
          userAvatar ? <img src={userAvatar} alt="Me" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px]">Me</div>
        ) : (
          <img src={charAvatar} alt={displayName} className="h-full w-full object-cover" />
        )}
      </div>

      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        {!isUser && (
          <span className="mb-1 ml-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">
            {displayName}
          </span>
        )}
        
        <div
          className={cn(
            "relative px-4 py-3 text-[14px] leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-sm bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] shadow-md"
              : "rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm",
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

          <ContentWithMentions content={message.content} />
        </div>
        
        <p className="mt-1.5 px-1 text-[10px] text-[var(--muted-foreground)] opacity-60">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </motion.article>
  )
}
