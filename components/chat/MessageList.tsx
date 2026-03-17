"use client"

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
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end gap-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          {messages.length ? (
            messages.map((message, index) => (
              <MessageBubble index={index} key={message.id} message={message} />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState subtitle={emptySubtitle} title={emptyTitle} />
            </div>
          )}

          {isGenerating ? <TypingIndicator /> : null}
        </div>
      </ScrollArea>
    </div>
  )
}
