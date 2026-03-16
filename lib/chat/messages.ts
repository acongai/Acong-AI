import { createAdminClient } from "@/lib/db/client"
import { COPY } from "@/lib/copy"
import type {
  ChatMessageInsert,
  ChatMessageRow,
  ChatMessageStatus,
  Json,
} from "@/lib/db/types"
import type { AppMessage } from "@/types"

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

export function mapChatMessageToAppMessage(row: ChatMessageRow): AppMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content_text ?? getStatusFallback(row.status),
    createdAt: row.created_at ?? row.updated_at ?? undefined,
    status: row.status ?? undefined,
  }
}

export async function listMessagesForThread(userId: string, threadId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ChatMessageRow[]
}

export async function getConversationContext(
  userId: string,
  threadId: string,
  limit = 10,
) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .in("status", ["sent", "completed"])
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return ((data ?? []) as ChatMessageRow[]).reverse()
}

export async function getConversationContextUpToMessage(
  userId: string,
  threadId: string,
  messageId: string,
  limit = 10,
) {
  const admin = createAdminClient()
  const { data: anchorMessage, error: anchorError } = await admin
    .from("chat_messages")
    .select("created_at")
    .eq("id", messageId)
    .eq("user_id", userId)
    .maybeSingle()

  if (anchorError) {
    throw anchorError
  }

  if (!anchorMessage?.created_at) {
    return [] as ChatMessageRow[]
  }

  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .lte("created_at", anchorMessage.created_at)
    .in("status", ["sent", "completed"])
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return ((data ?? []) as ChatMessageRow[]).reverse()
}

export async function getLastUserMessage(userId: string, threadId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as ChatMessageRow | null
}

export async function getMessageById(userId: string, messageId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as ChatMessageRow | null
}

export async function getOldestAwaitingPaymentAssistant(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("role", "assistant")
    .eq("status", "awaiting_payment")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as ChatMessageRow | null
}

export async function createUserMessage({
  content,
  threadId,
  userId,
}: {
  content: string
  threadId: string
  userId: string
}) {
  const admin = createAdminClient()
  const payload: ChatMessageInsert = {
    thread_id: threadId,
    user_id: userId,
    role: "user",
    content_text: content,
    content_type: "text",
    status: "sent",
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from("chat_messages")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatMessageRow
}

export async function createAssistantPlaceholder({
  metadata,
  parentMessageId,
  status,
  threadId,
  userId,
}: {
  metadata?: Json | null
  parentMessageId: string
  status: Extract<ChatMessageStatus, "generating" | "awaiting_payment">
  threadId: string
  userId: string
}) {
  const admin = createAdminClient()
  const payload: ChatMessageInsert = {
    thread_id: threadId,
    user_id: userId,
    role: "assistant",
    content_text: null,
    content_type: "text",
    status,
    parent_message_id: parentMessageId,
    metadata: metadata ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from("chat_messages")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatMessageRow
}

export async function completeAssistantMessage({
  content,
  messageId,
  metadata,
  userId,
}: {
  content: string
  messageId: string
  metadata?: Json | null
  userId: string
}) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .update({
      content_text: content,
      metadata: metadata ?? null,
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatMessageRow
}

export async function failAssistantMessage({
  content,
  messageId,
  metadata,
  userId,
}: {
  content: string
  messageId: string
  metadata?: Json | null
  userId: string
}) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .update({
      content_text: content,
      metadata: metadata ?? null,
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatMessageRow
}

export async function updateMessageStatus({
  messageId,
  metadata,
  status,
  userId,
}: {
  messageId: string
  metadata?: Json | null
  status: ChatMessageStatus
  userId: string
}) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_messages")
    .update({
      metadata: metadata ?? null,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatMessageRow
}
