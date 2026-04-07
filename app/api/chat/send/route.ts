import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { orchestrateTextReply } from "@/lib/ai/orchestrator"
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
  threadId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(4000),
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
    return NextResponse.json(
      {
        error: copy.api.sendRateLimit,
      },
      { status: 429 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        error: copy.api.sendUnauthorized,
      },
      { status: 401 },
    )
  }

  const rawBody = await request.json().catch(() => null)
  const parsedBody = sendMessageSchema.safeParse(rawBody)

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: copy.api.sendInvalid,
      },
      { status: 400 },
    )
  }

  const { attachmentIds, content, threadId } = parsedBody.data

  const initialThread =
    threadId !== undefined
      ? await getThreadForUser(user.id, threadId)
      : await createThread(user.id)

  if (!initialThread) {
    return NextResponse.json(
      {
        error: copy.api.sendThreadMissing,
      },
      { status: 404 },
    )
  }

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

  await touchThread(initialThread.id, userMessage.created_at ?? undefined)
  const thread =
    (await maybeGenerateThreadTitleFromMessage(
      user.id,
      initialThread.id,
      content,
    )) ?? initialThread

  let debitResult

  try {
    debitResult = await debitCredits(user.id, 1, {
      note: "Charge for sent message",
      referenceId: userMessage.id,
      referenceType: "message",
    })
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      const awaitingPaymentMessage = await createAssistantPlaceholder({
        parentMessageId: userMessage.id,
        status: "awaiting_payment",
        threadId: thread.id,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: copy.api.sendNoCredits,
          messageId: awaitingPaymentMessage.id,
          threadId: thread.id,
        },
        { status: 402 },
      )
    }

    console.error("chat_send_debit_error", {
      error,
      thread_id: thread.id,
      user_id: user.id,
    })

    return NextResponse.json(
      {
        error: copy.api.sendDebitFailed,
      },
      { status: 500 },
    )
  }

  const assistantPlaceholder = await createAssistantPlaceholder({
    parentMessageId: userMessage.id,
    status: "generating",
    threadId: thread.id,
    userId: user.id,
  })

  try {
    const historyRows = await getConversationContext(user.id, thread.id, 10)
    const history = historyRows
      .filter((message) => message.id !== userMessage.id)
      .map((message) => ({
        content: message.content_text ?? "",
        role: message.role as "assistant" | "user",
      }))

    const orchestration = await orchestrateTextReply({
      history,
      locale,
      userInput: content,
    })
    const assistantMessage = await completeAssistantMessage({
      content: orchestration.outputText,
      messageId: assistantPlaceholder.id,
      metadata: {
        ai_finish_message: orchestration.meta.finishMessage,
        ai_finish_reason: orchestration.meta.finishReason,
        ai_is_truncated: orchestration.meta.isTruncated,
        ai_request_id: orchestration.meta.requestId,
        ai_response_id: orchestration.meta.responseId,
        ai_usage_metadata: orchestration.meta.usageMetadata,
        roast_applied: orchestration.meta.roastApplied,
        typo_score: orchestration.meta.typoScore,
      },
      userId: user.id,
    })

    await touchThread(thread.id, assistantMessage.updated_at ?? undefined)

    return NextResponse.json({
      assistantMessage,
      balance: debitResult.balance,
      threadId: thread.id,
      threadTitle: thread.title,
      userMessage,
    })
  } catch (error) {
    console.error("chat_send_generation_error", {
      error,
      thread_id: thread.id,
      user_id: user.id,
    })

    const failureMessage = copy.errorMessage

    await failAssistantMessage({
      content: failureMessage,
      messageId: assistantPlaceholder.id,
      metadata: {
        stage: "send",
      },
      userId: user.id,
    })

    await refundCredits(user.id, 1, {
      note: "Refund for failed generation",
      referenceId: assistantPlaceholder.id,
      referenceType: "refund",
    })

    return NextResponse.json(
      {
        error: failureMessage,
        messageId: assistantPlaceholder.id,
        threadId: thread.id,
      },
      { status: 500 },
    )
  }
}
