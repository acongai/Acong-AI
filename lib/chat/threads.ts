import { createAdminClient } from "@/lib/db/client"
import type { ChatThreadInsert, ChatThreadRow } from "@/lib/db/types"

function sanitizeTitleSource(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/[!?.,:;]+$/g, "")
    .trim()
}

export function generateThreadTitle(input: string) {
  const sanitized = sanitizeTitleSource(input)

  if (!sanitized) {
    return "Obrolan tanpa arah"
  }

  if (sanitized.length <= 48) {
    return sanitized
  }

  return `${sanitized.slice(0, 45).trimEnd()}...`
}

export async function listThreadsForUser(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_threads")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .order("updated_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as ChatThreadRow[]
}

export async function getThreadForUser(userId: string, threadId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as ChatThreadRow | null
}

export async function createThread(userId: string, title?: string | null, type: string = "individual", metadata: any = {}) {
  const admin = createAdminClient()
  const payload: any = {
    user_id: userId,
    title: title ?? null,
    status: "active",
    type,
    metadata,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from("chat_threads")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatThreadRow
}

export async function touchThread(threadId: string, timestamp?: string) {
  const admin = createAdminClient()
  const nextTimestamp = timestamp ?? new Date().toISOString()

  const { data, error } = await admin
    .from("chat_threads")
    .update({
      last_message_at: nextTimestamp,
      updated_at: nextTimestamp,
    })
    .eq("id", threadId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatThreadRow
}

export async function maybeGenerateThreadTitleFromMessage(
  userId: string,
  threadId: string,
  firstMessage: string,
) {
  const thread = await getThreadForUser(userId, threadId)

  if (!thread || thread.title?.trim()) {
    return thread
  }

  const admin = createAdminClient()
  const title = generateThreadTitle(firstMessage)
  const { data, error } = await admin
    .from("chat_threads")
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as ChatThreadRow
}
