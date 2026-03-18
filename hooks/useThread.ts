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
    return {
      isPreviewMode: false,
      messages: [],
      threadTitle: null,
      threads: [],
    }
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

  async function sendMessage(content: string, attachmentIds: string[] = []) {
    const normalized = content.trim()

    if (!normalized) {
      return "idle" as const
    }

    const optimisticId = `optimistic-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user" as const,
        content: normalized,
        createdAt: new Date().toISOString(),
      },
    ])

    setIsSending(true)
    setError(null)

    try {
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

  async function deleteThread(threadIdToDelete: string) {
    const { error } = await supabase
      .from("chat_threads")
      .delete()
      .eq("id", threadIdToDelete)

    if (error) {
      throw error
    }

    await refresh()

    if (threadIdToDelete === threadId) {
      router.push("/")
    }
  }

  async function regenerateLastReply() {
    setIsSending(true)
    setError(null)

    try {
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
        const message = payload.error ?? COPY.api.sendFailed

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
          : COPY.api.sendFailed

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
    deleteThread,
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
