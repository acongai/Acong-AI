"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AppMessage } from "@/types"

import { EmptyState } from "./EmptyState"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"

interface MessageListProps {
  emptySubtitle: string
  emptyTitle: string
  isGenerating?: boolean
  messages: AppMessage[]
}

export function MessageList({
  emptySubtitle,
  emptyTitle,
  isGenerating = false,
  messages,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Scroll when messages change (new user or assistant message)
  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  // Scroll when typing indicator appears
  useEffect(() => {
    if (isGenerating) {
      scrollToBottom()
    }
  }, [isGenerating])

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end gap-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          {messages.length ? (
            messages
              .filter((message, index, self) => self.findIndex((m) => m.id === message.id) === index)
              .map((message, index) => (
                <MessageBubble index={index} key={message.id} message={message} />
              ))
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState subtitle={emptySubtitle} title={emptyTitle} />
            </div>
          )}

          {isGenerating ? <TypingIndicator /> : null}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
