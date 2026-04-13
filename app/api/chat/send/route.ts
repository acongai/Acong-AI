import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { orchestrateTextReply, routeGroupChat } from "@/lib/ai/orchestrator"
import { debitCredits, InsufficientCreditsError, refundCredits } from "@/lib/billing/credits"
import {
  completeAssistantMessage,
  createAssistantPlaceholder,
  createUserMessage,
  failAssistantMessage,
  getConversationContext,
} from "@/lib/chat/messages"
import {
  createThread,
  getThreadForUser,
  maybeGenerateThreadTitleFromMessage,
  touchThread,
} from "@/lib/chat/threads"
import { COPY } from "@/lib/copy"
import { COPY_EN } from "@/lib/copy-en"
import { attachUploadsToMessage } from "@/lib/storage/upload"
import { createClient } from "@/supabase/server"
import { checkRateLimit, getClientIp } from "@/lib/utils/ratelimit"

const sendMessageSchema = z.object({
  attachmentIds: z.array(z.string().uuid()).max(4).optional().default([]),
  characterId: z.string().optional(),
  threadId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(4000),
  localTime: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "unknown"
  const rateLimit = checkRateLimit({
    key: `chat:${ip}`,
    limit: 30,
    windowMs: 60_000,
  })

  const locale = (request.cookies.get("NEXT_LOCALE")?.value as "id" | "en") || "id"
  const copy = locale === "en" ? COPY_EN : COPY

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: copy.api.sendRateLimit }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: copy.api.sendUnauthorized }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsedBody = sendMessageSchema.safeParse(rawBody)

  if (!parsedBody.success) {
    return NextResponse.json({ error: copy.api.sendInvalid }, { status: 400 })
  }

  const { attachmentIds, characterId, content, threadId, localTime } = parsedBody.data

  const initialThread = threadId !== undefined
    ? await getThreadForUser(user.id, threadId)
    : await createThread(user.id)

  if (!initialThread) {
    return NextResponse.json({ error: copy.api.sendThreadMissing }, { status: 404 })
  }

  const isGroup = initialThread.type === 'group'
  const metadata = (initialThread.metadata as any) || {}
  const memberIds = metadata.memberIds || []
  const kickedIds = metadata.kickedIds || []
  const activeMembers = memberIds.filter((id: string) => !kickedIds.includes(id))

  let characterOrder: string[] = []
  const mentionRegex = /@(\w+)/g
  const mentions = Array.from(content.matchAll(mentionRegex)).map(match => match[1].toLowerCase())
  
  // Find all characters that are mentioned AND active in this thread
  const mentionedActive = mentions.filter(m => activeMembers.includes(m))
  
  if (mentionedActive.length > 0) {
    characterOrder = Array.from(new Set(mentionedActive))
  } else if (isGroup) {
    characterOrder = await routeGroupChat({ userInput: content, activeMemberIds: activeMembers })
  } else {
    characterOrder = [characterId || 'acong']
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, gender")
    .eq("id", user.id)
    .single()

  const userName = profile?.full_name ?? user.user_metadata?.full_name
  const userGender = profile?.gender as "male" | "female" | undefined

  // Deduplicate characterOrder to prevent double responses
  characterOrder = Array.from(new Set(characterOrder))

  const creditCost = characterOrder.length

  const userMessage = await createUserMessage({
    content,
    threadId: initialThread.id,
    userId: user.id,
  })

  await attachUploadsToMessage({
    attachmentIds,
    messageId: userMessage.id,
    threadId: initialThread.id,
    userId: user.id,
  })

  await touchThread(initialThread.id, user.id, userMessage.created_at ?? undefined)
  const thread = (await maybeGenerateThreadTitleFromMessage(user.id, initialThread.id, content)) ?? initialThread

  try {
    await debitCredits(user.id, creditCost, {
      note: `Reply from ${characterOrder.join(", ")}`,
      referenceId: userMessage.id,
      referenceType: "message",
    })
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      const p = await createAssistantPlaceholder({
        parentMessageId: userMessage.id,
        status: "awaiting_payment",
        threadId: thread.id,
        userId: user.id,
      })
      return NextResponse.json({ error: copy.api.sendNoCredits, messageId: p.id, threadId: thread.id }, { status: 402 })
    }
    return NextResponse.json({ error: copy.api.sendDebitFailed }, { status: 500 })
  }

  // Sequential Replies — accumulate round context for Enhancement 2
  const results = []
  const roundContext: { characterId: string; text: string }[] = []

  for (const charId of characterOrder) {
    const placeholder = await createAssistantPlaceholder({
      parentMessageId: userMessage.id,
      status: "generating",
      threadId: thread.id,
      userId: user.id,
      metadata: { character_id: charId }
    })

    try {
      const historyRows = await getConversationContext(user.id, thread.id, isGroup ? 10 : 20)
      const history = historyRows
        .filter((message) => message.id !== placeholder.id)
        .map((message) => ({
          content: message.content_text ?? "",
          role: message.role as "assistant" | "user",
        }))

      const orchestration = await orchestrateTextReply({
        characterId: charId,
        history,
        locale,
        userInput: content,
        groupMemberIds: isGroup ? activeMembers : [],
        kickedIds: isGroup ? kickedIds : [],
        userName,
        userGender,
        localTime,
        roundContext: isGroup ? [...roundContext] : [],
      })

      const assistantMessage = await completeAssistantMessage({
        content: orchestration.outputText,
        messageId: placeholder.id,
        metadata: {
          character_id: charId,
          group_turn: isGroup,
        },
        userId: user.id,
      })

      // Add this character's response to round context for next characters
      if (isGroup) {
        roundContext.push({ characterId: charId, text: orchestration.outputText })
      }

      results.push(assistantMessage)
      await touchThread(thread.id, user.id, assistantMessage.updated_at ?? undefined)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const errStack = err instanceof Error ? err.stack : undefined
      console.error("[send:orchestrator] character reply failed", {
        characterId: charId,
        threadId: thread.id,
        isGroup,
        errorMessage: errMsg,
        errorStack: errStack,
        timestamp: new Date().toISOString(),
      })
      // Delete placeholder and insert system error message — DO NOT block other characters
      await supabase.from("chat_messages").delete().eq("id", placeholder.id)
      await supabase.from("chat_messages").insert({
        thread_id: thread.id,
        user_id: user.id,
        role: "system",
        content_text: `[${charId}] ${copy.errorMessage}`,
        content_type: "system",
        status: "completed"
      })
      // Refund 1 credit for this failed character
      await refundCredits(user.id, 1, {
        note: `Refund for failed ${charId} reply: ${errMsg}`,
        referenceId: placeholder.id,
        referenceType: "message",
      })
      // continue to next character in loop
    }
  }

  return NextResponse.json({
    assistantMessages: results,
    threadId: thread.id,
    threadTitle: thread.title,
    userMessage,
  })
}
