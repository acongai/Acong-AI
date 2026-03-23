import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { orchestrateTextReply } from "@/lib/ai/orchestrator"
import { debitCredits, InsufficientCreditsError, refundCredits } from "@/lib/billing/credits"
import {
  completeAssistantMessage,
  createAssistantPlaceholder,
  failAssistantMessage,
  getConversationContextUpToMessage,
  getLastUserMessage,
} from "@/lib/chat/messages"
import { getThreadForUser, touchThread } from "@/lib/chat/threads"
import { COPY } from "@/lib/copy"
import { createClient } from "@/supabase/server"
import { checkRateLimit, getClientIp } from "@/lib/utils/ratelimit"

const regenerateSchema = z.object({
  threadId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "unknown"
  const rateLimit = checkRateLimit({
    key: `chat-regenerate:${ip}`,
    limit: 30,
    windowMs: 60_000,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: COPY.api.regenerateRateLimit,
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
        error: COPY.api.regenerateUnauthorized,
      },
      { status: 401 },
    )
  }

  const rawBody = await request.json().catch(() => null)
  const parsedBody = regenerateSchema.safeParse(rawBody)

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: COPY.api.regenerateInvalid,
      },
      { status: 400 },
    )
  }

  const thread = await getThreadForUser(user.id, parsedBody.data.threadId)

  if (!thread) {
    return NextResponse.json(
      {
        error: COPY.api.regenerateMissingThread,
      },
      { status: 404 },
    )
  }

  const lastUserMessage = await getLastUserMessage(user.id, thread.id)

  if (!lastUserMessage?.content_text) {
    return NextResponse.json(
      {
        error: COPY.api.regenerateMissingUserPrompt,
      },
      { status: 400 },
    )
  }

  try {
    await debitCredits(user.id, 1, {
      note: "Charge for regenerate",
      referenceId: lastUserMessage.id,
      referenceType: "regenerate",
    })
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      const awaitingPaymentMessage = await createAssistantPlaceholder({
        parentMessageId: lastUserMessage.id,
        status: "awaiting_payment",
        threadId: thread.id,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: COPY.api.regenerateNoCredits,
          messageId: awaitingPaymentMessage.id,
          threadId: thread.id,
        },
        { status: 402 },
      )
    }

    throw error
  }

  const assistantPlaceholder = await createAssistantPlaceholder({
    parentMessageId: lastUserMessage.id,
    status: "generating",
    threadId: thread.id,
    userId: user.id,
  })

  try {
    const historyRows = await getConversationContextUpToMessage(
      user.id,
      thread.id,
      lastUserMessage.id,
      10,
    )

    const history = historyRows
      .filter((message) => message.id !== lastUserMessage.id)
      .map((message) => ({
        content: message.content_text ?? "",
        role: message.role as "assistant" | "user",
      }))

    const orchestration = await orchestrateTextReply({
      history,
      userInput: lastUserMessage.content_text,
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
      threadId: thread.id,
    })
  } catch (error) {
    console.error("chat_regenerate_error", {
      error,
      thread_id: thread.id,
      user_id: user.id,
    })

    const failureMessage = COPY.errorMessage

    await failAssistantMessage({
      content: failureMessage,
      messageId: assistantPlaceholder.id,
      metadata: {
        stage: "regenerate",
      },
      userId: user.id,
    })

    await refundCredits(user.id, 1, {
      note: "Refund for failed regenerate",
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
