"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { toast } from "sonner"

import { COPY } from "@/lib/copy"
import type {
  ChatMessageRow,
  ChatMessageStatus,
  Database,
  MessageAttachmentRow,
} from "@/lib/db/types"
import { createClient } from "@/supabase/client"
import type { AppMessage, AppThread } from "@/types"

interface UseThreadOptions {
  includeMessages?: boolean
  threadId?: string
}

interface PaymentPromptState {
  messageId: string
  threadId: string
}

interface ThreadStateSnapshot {
  isPreviewMode: boolean
  messages: AppMessage[]
  threadTitle: string | null
  threads: AppThread[]
}

const PREVIEW_THREADS = COPY.preview.threads
const DEFAULT_PREVIEW_THREAD_ID = PREVIEW_THREADS[0].id

function getStatusFallback(status?: ChatMessageStatus | null) {
  switch (status) {
    case "generating":
      return COPY.loadingMessages[0]
    case "awaiting_payment":
      return COPY.paywallSubtitle
    case "failed":
      return COPY.errorMessage
    default:
      return ""
  }
}

function mapChatMessageToAppMessage(row: ChatMessageRow): AppMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content_text ?? getStatusFallback(row.status),
    createdAt: row.created_at ?? row.updated_at ?? undefined,
    status: row.status ?? undefined,
  }
}

function withMessageAttachments({
  attachmentsByMessage,
  rows,
}: {
  attachmentsByMessage: Map<string, AppMessage["attachments"]>
  rows: ChatMessageRow[]
}) {
  return rows.map((row) => ({
    ...mapChatMessageToAppMessage(row),
    attachments: attachmentsByMessage.get(row.id) ?? [],
  }))
}

function toThreadPreview(
  messages: Array<Pick<ChatMessageRow, "content_text" | "thread_id">>,
) {
  const previewByThread = new Map<string, string>()
  const countByThread = new Map<string, number>()

  messages.forEach((message) => {
    const currentThreadId = message.thread_id

    if (!currentThreadId) {
      return
    }

    countByThread.set(
      currentThreadId,
      (countByThread.get(currentThreadId) ?? 0) + 1,
    )

    if (!previewByThread.has(currentThreadId) && message.content_text?.trim()) {
      previewByThread.set(currentThreadId, message.content_text)
    }
  })

  return {
    countByThread,
    previewByThread,
  }
}

function toAppThreads(
  threads: Array<{
    id: string
    last_message_at: string | null
    title: string | null
    updated_at: string | null
  }>,
  previews: ReturnType<typeof toThreadPreview>,
): AppThread[] {
  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title?.trim() || COPY.thread.untitledThread,
    preview: previews.previewByThread.get(thread.id) ?? COPY.thread.emptyPreview,
    updatedAt:
      thread.last_message_at ??
      thread.updated_at ??
      new Date("2026-03-17T00:00:00.000Z").toISOString(),
    messageCount: previews.countByThread.get(thread.id) ?? 0,
  }))
}

function getPreviewThreadId(threadId?: string) {
  return PREVIEW_THREADS.some((thread) => thread.id === threadId)
    ? threadId
    : DEFAULT_PREVIEW_THREAD_ID
}

function getPreviewConversation(threadId?: string) {
  const previewThreadId = getPreviewThreadId(threadId)

  if (previewThreadId === "preview-chaos") {
    return COPY.preview.conversations.chaos
  }

  if (previewThreadId === "preview-billing") {
    return COPY.preview.conversations.billing
  }

  return COPY.preview.conversations.lobby
}

function minutesAgo(value: number) {
  return new Date(Date.now() - value * 60 * 1000).toISOString()
}

function toPreviewMessages(threadId?: string): AppMessage[] {
  return getPreviewConversation(threadId).map((message, index) => ({
    id: `${getPreviewThreadId(threadId)}-${index}`,
    role: message.role,
    content: message.content,
    createdAt: minutesAgo((getPreviewConversation(threadId).length - index) * 3),
  }))
}

function createPreviewState(threadId?: string): ThreadStateSnapshot {
  const activePreviewThreadId = getPreviewThreadId(threadId)
  const conversationsById = new Map(
    PREVIEW_THREADS.map((thread) => [thread.id, toPreviewMessages(thread.id)]),
  )

  return {
    isPreviewMode: true,
    messages: toPreviewMessages(activePreviewThreadId),
    threadTitle:
      PREVIEW_THREADS.find((thread) => thread.id === activePreviewThreadId)
        ?.title ?? COPY.thread.untitled,
    threads: PREVIEW_THREADS.map((thread, index) => ({
      id: thread.id,
      title: thread.title,
      preview: thread.preview,
      updatedAt: minutesAgo((index + 1) * 11),
      messageCount: conversationsById.get(thread.id)?.length ?? 0,
    })),
  }
}

function pickPreviewReply({
  input,
  variant = "default",
}: {
  input: string
  variant?: "default" | "regenerate"
}) {
  const normalized = input.trim().toLowerCase()
  let pool: readonly string[] = COPY.preview.replyGeneric

  if (variant === "regenerate") {
    pool = COPY.preview.replyRegenerate
  } else if (/^(halo|hai|hi|woi|oi)\b/.test(normalized)) {
    pool = COPY.preview.replyGreeting
  } else if (/(kredit|credit|bayar|harga|paket|dompet)/.test(normalized)) {
    pool = COPY.preview.replyBilling
  } else if (normalized.length < 20) {
    pool = COPY.preview.replyShort
  }

  const seed = normalized
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0)

  return pool[seed % pool.length]
}

function createPreviewAssistantMessage({
  input,
  variant = "default",
}: {
  input: string
  variant?: "default" | "regenerate"
}): AppMessage {
  return {
    id: `preview-assistant-${Date.now()}`,
    role: "assistant",
    content: pickPreviewReply({
      input,
      variant,
    }),
    createdAt: new Date().toISOString(),
    status: "completed",
  }
}

function createPreviewUserMessage(input: string): AppMessage {
  return {
    id: `preview-user-${Date.now()}`,
    role: "user",
    content: input,
    createdAt: new Date().toISOString(),
    status: "sent",
  }
}

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

async function fetchThreadState({
  includeMessages,
  supabase,
  threadId,
}: {
  includeMessages: boolean
  supabase: SupabaseClient<Database>
  threadId?: string
}): Promise<ThreadStateSnapshot> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return createPreviewState(threadId)
  }

  const { data: threadRows, error: threadError } = await supabase
    .from("chat_threads")
    .select("id,title,last_message_at,updated_at")
    .order("last_message_at", { ascending: false })
    .order("updated_at", { ascending: false })

  if (threadError) {
    throw threadError
  }

  const normalizedThreads =
    (threadRows ?? []) as Array<{
      id: string
      last_message_at: string | null
      title: string | null
      updated_at: string | null
    }>

  const threadIds = normalizedThreads.map((thread) => thread.id)
  let previewRows: Array<Pick<ChatMessageRow, "content_text" | "thread_id">> = []

  if (threadIds.length) {
    const { data: latestMessages, error: latestMessagesError } = await supabase
      .from("chat_messages")
      .select("thread_id,content_text")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false })

    if (latestMessagesError) {
      throw latestMessagesError
    }

    previewRows =
      (latestMessages ?? []) as Array<
        Pick<ChatMessageRow, "content_text" | "thread_id">
      >
  }

  const previews = toThreadPreview(previewRows)

  if (!includeMessages || !threadId) {
    return {
      isPreviewMode: false,
      messages: [],
      threadTitle: null,
      threads: toAppThreads(normalizedThreads, previews),
    }
  }

  const { data: currentThread, error: currentThreadError } = await supabase
    .from("chat_threads")
    .select("id,title")
    .eq("id", threadId)
    .maybeSingle()

  if (currentThreadError) {
    throw currentThreadError
  }

  const { data: messageRows, error: messageError } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (messageError) {
    throw messageError
  }

  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("message_attachments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (attachmentError) {
    throw attachmentError
  }

  const attachmentsByMessage = new Map<string, AppMessage["attachments"]>()

  ;((attachmentRows ?? []) as MessageAttachmentRow[]).forEach((attachment) => {
    if (!attachment.message_id || !attachment.public_url) {
      return
    }

    const current = attachmentsByMessage.get(attachment.message_id) ?? []
    current.push({
      id: attachment.id,
      fileName: attachment.file_name ?? undefined,
      fileType: "image",
      mimeType: attachment.mime_type ?? undefined,
      url: attachment.public_url,
    })
    attachmentsByMessage.set(attachment.message_id, current)
  })

  return {
    isPreviewMode: false,
    messages: withMessageAttachments({
      attachmentsByMessage,
      rows: (messageRows ?? []) as ChatMessageRow[],
    }),
    threadTitle: currentThread?.title ?? null,
    threads: toAppThreads(normalizedThreads, previews),
  }
}

export function useThread({
  includeMessages = true,
  threadId,
}: UseThreadOptions = {}) {
  const [supabase] = useState(() => createClient())
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [messages, setMessages] = useState<AppMessage[]>([])
  const [paymentPrompt, setPaymentPrompt] = useState<PaymentPromptState | null>(
    null,
  )
  const [threads, setThreads] = useState<AppThread[]>([])
  const [threadTitle, setThreadTitle] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)

      try {
        const state = await fetchThreadState({
          includeMessages,
          supabase,
          threadId,
        })

        if (cancelled) {
          return
        }

        setIsPreviewMode(state.isPreviewMode)
        setThreads(state.threads)
        setMessages(state.messages)
        setThreadTitle(state.threadTitle)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : COPY.errorMessage

        setError(message)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [includeMessages, supabase, threadId])

  async function refresh() {
    setIsLoading(true)

    try {
      const state = await fetchThreadState({
        includeMessages,
        supabase,
        threadId,
      })

      setIsPreviewMode(state.isPreviewMode)
      setThreads(state.threads)
      setMessages(state.messages)
      setThreadTitle(state.threadTitle)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : COPY.errorMessage,
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function sendPreviewMessage(content: string) {
    const activePreviewThreadId = getPreviewThreadId(threadId)
    const userMessage = createPreviewUserMessage(content)

    setMessages((current) => [...current, userMessage])
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activePreviewThreadId
          ? {
              ...thread,
              messageCount: thread.messageCount + 1,
              preview: content,
              updatedAt: userMessage.createdAt ?? new Date().toISOString(),
            }
          : thread,
      ),
    )
    setThreadTitle(
      PREVIEW_THREADS.find((thread) => thread.id === activePreviewThreadId)?.title ??
        COPY.thread.untitled,
    )

    await sleep(850)

    const assistantMessage = createPreviewAssistantMessage({
      input: content,
    })

    setMessages((current) => [...current, assistantMessage])
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activePreviewThreadId
          ? {
              ...thread,
              messageCount: thread.messageCount + 1,
              updatedAt: assistantMessage.createdAt ?? new Date().toISOString(),
            }
          : thread,
      ),
    )

    return "sent" as const
  }

  async function sendMessage(content: string, attachmentIds: string[] = []) {
    const normalized = content.trim()

    if (!normalized) {
      return "idle" as const
    }

    setIsSending(true)
    setError(null)

    try {
      if (isPreviewMode) {
        return await sendPreviewMessage(normalized)
      }

      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attachmentIds,
          content: normalized,
          threadId,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        messageId?: string
        threadId?: string
      }

      if (response.status === 401) {
        setLoginPromptOpen(true)
        return "login_required" as const
      }

      if (response.status === 402 && payload.threadId && payload.messageId) {
        setPaymentPrompt({
          messageId: payload.messageId,
          threadId: payload.threadId,
        })
        await refresh()

        if (!threadId) {
          router.push(`/chat/${payload.threadId}`)
        }

        return "payment_required" as const
      }

      if (!response.ok) {
        const message = payload.error ?? COPY.api.sendFailed

        setError(message)
        toast.error(message)
        await refresh()
        return "error" as const
      }

      if (payload.threadId && !threadId) {
        router.push(`/chat/${payload.threadId}`)
        return "sent" as const
      }

      await refresh()
      return "sent" as const
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : COPY.api.sendFailed

      setError(message)
      toast.error(message)
      return "error" as const
    } finally {
      setIsSending(false)
    }
  }

  async function regenerateLastReply() {
    setIsSending(true)
    setError(null)

    try {
      if (isPreviewMode) {
        const lastUserMessage = [...messages]
          .reverse()
          .find((message) => message.role === "user")

        if (!lastUserMessage) {
          return "idle" as const
        }

        await sleep(650)

        const regeneratedMessage = createPreviewAssistantMessage({
          input: lastUserMessage.content,
          variant: "regenerate",
        })

        setMessages((current) => {
          const nextMessages = [...current]

          for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
            if (nextMessages[index]?.role === "assistant") {
              nextMessages[index] = regeneratedMessage
              return nextMessages
            }
          }

          nextMessages.push(regeneratedMessage)
          return nextMessages
        })

        return "sent" as const
      }

      const response = await fetch("/api/chat/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        messageId?: string
        threadId?: string
      }

      if (response.status === 401) {
        setLoginPromptOpen(true)
        return "login_required" as const
      }

      if (response.status === 402 && payload.threadId && payload.messageId) {
        setPaymentPrompt({
          messageId: payload.messageId,
          threadId: payload.threadId,
        })
        await refresh()
        return "payment_required" as const
      }

      if (!response.ok) {
        const message = payload.error ?? COPY.errorMessage

        setError(message)
        toast.error(message)
        await refresh()
        return "error" as const
      }

      await refresh()
      return "sent" as const
    } catch (regenerateError) {
      const message =
        regenerateError instanceof Error
          ? regenerateError.message
          : COPY.errorMessage

      setError(message)
      toast.error(message)
      return "error" as const
    } finally {
      setIsSending(false)
    }
  }

  return {
    closeLoginPrompt: () => setLoginPromptOpen(false),
    closePaymentPrompt: () => setPaymentPrompt(null),
    error,
    isLoading,
    isPreviewMode,
    isSending,
    loginPromptOpen,
    messages,
    paymentPrompt,
    refresh,
    regenerateLastReply,
    sendMessage,
    threadTitle,
    threads,
  }
}
