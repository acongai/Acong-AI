
import { orchestrateTextReply } from "@/lib/ai/orchestrator"
import {
  debitCredits,
  InsufficientCreditsError,
  purchaseCredits,
  refundCredits,
} from "@/lib/billing/credits"
import {
  getConversationContextUpToMessage,
  getMessageById,
  getOldestAwaitingPaymentAssistant,
  completeAssistantMessage,
  failAssistantMessage,
  updateMessageStatus,
} from "@/lib/chat/messages"
import { getThreadForUser, touchThread } from "@/lib/chat/threads"
import { createAdminClient } from "@/lib/db/client"
import type { PaymentRow } from "@/lib/db/types"
import {
  CREDIT_PACKAGES,
  type CreditPackage,
  type CreditPackageCode,
} from "@/lib/billing/wallet"

interface CreateMayarInvoiceParams {
  packageConfig: CreditPackage
  paymentId: string
  redirectUrl: string
  threadId?: string | null
  user: {
    email: string | null
    id: string
  }
}

interface MayarInvoiceResponse {
  checkoutUrl: string
  externalInvoiceId: string
  externalPaymentId: string
  raw: unknown
}

interface ParsedMayarWebhookEvent {
  eventType: string
  externalEventId: string
  externalInvoiceId: string | null
  externalPaymentId: string | null
  paymentState: "expired" | "failed" | "paid" | "unknown"
  payload: MayarWebhookPayload
}

interface MayarWebhookPayload {
  createdAt?: number | string
  data?: {
    amount?: number
    createdAt?: number | string
    customerEmail?: string
    customerMobile?: string
    customerName?: string
    id?: string
    invoiceId?: string
    paymentLinkId?: string
    productId?: string
    status?: boolean | string
    transactionStatus?: boolean | string
    transactionId?: string
    updatedAt?: number | string
  }
  event?: string | {
    received?: string
  }
  eventType?: string
  id?: string
  transactionId?: string
  type?: string
}

export { CREDIT_PACKAGES }
export type { CreditPackageCode }

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getMayarApiBaseUrl() {
  const rawBaseUrl =
    process.env.MAYAR_BASE_URL?.trim() || "https://api.mayar.id/hl/v1"

  if (
    rawBaseUrl === "https://mayar.id/api" ||
    rawBaseUrl === "http://mayar.id/api"
  ) {
    return "https://api.mayar.id/hl/v1"
  }

  if (
    rawBaseUrl === "https://api.mayar.id" ||
    rawBaseUrl === "http://api.mayar.id"
  ) {
    return `${rawBaseUrl.replace(/\/$/, "")}/hl/v1`
  }

  return rawBaseUrl.replace(/\/$/, "")
}

function normalizeMayarStatus(value?: boolean | string | null) {
  if (typeof value === "boolean") {
    return value ? "success" : "failed"
  }

  return value?.trim().toLowerCase() ?? null
}

export function getMayarPackages() {
  return Object.values(CREDIT_PACKAGES)
}

export async function createMayarInvoice({
  packageConfig,
  paymentId,
  redirectUrl,
  threadId,
  user,
}: CreateMayarInvoiceParams): Promise<MayarInvoiceResponse> {
  const endpoint = `${getMayarApiBaseUrl()}/invoice/create`
  const apiKey = getRequiredEnv("MAYAR_API_KEY")

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: user.email ?? "Acong User",
      email: user.email ?? "no-email@example.com",
      // TODO: Collect a real mobile number before production launch.
      mobile: "081234567890",
      redirectUrl,
      description: `Acong credits - ${packageConfig.credits} credits`,
      expiredAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      extraData: {
        localPaymentId: paymentId,
        ...(threadId ? { threadId } : {}),
        userId: user.id,
      },
      items: [
        {
          description: `${packageConfig.code} - ${packageConfig.credits} credits`,
          quantity: 1,
          rate: packageConfig.priceIdr,
        },
      ],
    }),
  })

  const payload = (await response.json()) as {
    data?: {
      id?: string
      link?: string
      transactionId?: string
    }
    messages?: string
  }

  if (!response.ok || !payload.data?.id || !payload.data.link) {
    throw new Error(payload.messages ?? "Mayar invoice creation failed")
  }

  return {
    checkoutUrl: payload.data.link,
    externalInvoiceId: payload.data.id,
    externalPaymentId:
      payload.data.transactionId ?? payload.data.id,
    raw: payload,
  }
}

/**
 * Verify a Mayar transaction by calling the Mayar API directly.
 * Used in lieu of signature verification (Mayar does not send signature headers).
 * Only returns true if Mayar confirms the invoice is paid.
 */
export async function confirmMayarTransactionPaid(externalInvoiceId: string): Promise<boolean> {
  const apiKey = getRequiredEnv("MAYAR_API_KEY")
  const endpoint = `${getMayarApiBaseUrl()}/invoice/${externalInvoiceId}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
  } catch {
    return false
  }

  if (!response.ok) {
    return false
  }

  const payload = (await response.json()) as {
    data?: {
      paymentLinkId?: string
      status?: boolean | string
      transactions?: Array<{
        id?: string
      }>
    }
  }

  const invoiceStatus = normalizeMayarStatus(payload.data?.status)

  return invoiceStatus === "paid" || invoiceStatus === "settled"
}

export function parseMayarWebhookEvent(
  payload: MayarWebhookPayload,
): ParsedMayarWebhookEvent {
  const eventType =
    typeof payload.event === "string"
      ? payload.event
      : payload.event?.received ?? payload.eventType ?? payload.type ?? "unknown"
  const transactionStatus = normalizeMayarStatus(payload.data?.transactionStatus)
  const deliveryStatus = normalizeMayarStatus(payload.data?.status)
  const externalPaymentId =
    payload.data?.transactionId ??
    payload.transactionId ??
    payload.data?.id ??
    payload.id ??
    null
  const externalInvoiceId =
    payload.data?.invoiceId ??
    payload.data?.paymentLinkId ??
    payload.data?.productId ??
    null
  const timestamp =
    payload.data?.updatedAt ??
    payload.data?.createdAt ??
    payload.createdAt ??
    "unknown"

  let paymentState: ParsedMayarWebhookEvent["paymentState"] = "unknown"

  if (
    eventType === "payment.received" ||
    transactionStatus === "paid" ||
    transactionStatus === "success" ||
    deliveryStatus === "paid" ||
    deliveryStatus === "success" ||
    deliveryStatus === "settled"
  ) {
    paymentState = "paid"
  } else if (
    eventType === "payment.reminder" ||
    transactionStatus === "expired" ||
    deliveryStatus === "expired"
  ) {
    paymentState = "expired"
  } else if (
    transactionStatus === "failed" ||
    deliveryStatus === "failed"
  ) {
    paymentState = "failed"
  }

  return {
    eventType,
    externalEventId: `${eventType}:${externalPaymentId ?? externalInvoiceId ?? "unknown"}:${timestamp}`,
    externalInvoiceId,
    externalPaymentId,
    paymentState,
    payload,
  }
}

export async function findPaymentByExternalReference({
  externalInvoiceId,
  externalPaymentId,
}: {
  externalInvoiceId?: string | null
  externalPaymentId?: string | null
}) {
  const admin = createAdminClient()

  if (externalPaymentId) {
    const { data, error } = await admin
      .from("payments")
      .select("*")
      .eq("external_payment_id", externalPaymentId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return data as PaymentRow
    }
  }

  if (externalInvoiceId) {
    const { data, error } = await admin
      .from("payments")
      .select("*")
      .eq("external_invoice_id", externalInvoiceId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data as PaymentRow | null
  }

  return null
}

async function hasPurchaseLedger(paymentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("reference_type", "payment")
    .eq("reference_id", paymentId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function processAwaitingPaymentMessage(userId: string) {
  const pendingAssistantMessage = await getOldestAwaitingPaymentAssistant(userId)

  if (!pendingAssistantMessage?.thread_id || !pendingAssistantMessage.parent_message_id) {
    return null
  }

  const parentUserMessage = await getMessageById(
    userId,
    pendingAssistantMessage.parent_message_id,
  )

  if (!parentUserMessage?.content_text) {
    return null
  }

  const thread = await getThreadForUser(userId, pendingAssistantMessage.thread_id)

  if (!thread) {
    return null
  }

  try {
    await debitCredits(userId, 1, {
      note: "Charge for resumed pending message",
      referenceId: parentUserMessage.id,
      referenceType: "message",
    })
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return null
    }

    throw error
  }

  await updateMessageStatus({
    messageId: pendingAssistantMessage.id,
    metadata: {
      payment_unlocked_at: new Date().toISOString(),
    },
    status: "generating",
    userId,
  })

  try {
    const historyRows = await getConversationContextUpToMessage(
      userId,
      thread.id,
      parentUserMessage.id,
      10,
    )

    const history = historyRows
      .filter((message) => message.id !== parentUserMessage.id)
      .map((message) => ({
        content: message.content_text ?? "",
        role: message.role as "assistant" | "user",
      }))

    const orchestration = await orchestrateTextReply({
      history,
      userInput: parentUserMessage.content_text,
    })
    const assistantMessage = await completeAssistantMessage({
      content: orchestration.outputText,
      messageId: pendingAssistantMessage.id,
      metadata: {
        ai_finish_message: orchestration.meta.finishMessage,
        ai_finish_reason: orchestration.meta.finishReason,
        ai_is_truncated: orchestration.meta.isTruncated,
        ai_request_id: orchestration.meta.requestId,
        ai_response_id: orchestration.meta.responseId,
        ai_usage_metadata: orchestration.meta.usageMetadata,
        resumed_from_payment: true,
        roast_applied: orchestration.meta.roastApplied,
        typo_score: orchestration.meta.typoScore,
      },
      userId,
    })

    await touchThread(thread.id, assistantMessage.updated_at ?? undefined)
    return assistantMessage
  } catch (error) {
    console.error("awaiting_payment_generation_error", {
      error,
      message_id: pendingAssistantMessage.id,
      thread_id: thread.id,
      user_id: userId,
    })

    const failureMessage =
      "Jawaban setelah bayar pun gagal jadi. Ironis, memang."

    await failAssistantMessage({
      content: failureMessage,
      messageId: pendingAssistantMessage.id,
      metadata: {
        stage: "payment_resume",
      },
      userId,
    })

    await refundCredits(userId, 1, {
      note: "Refund for failed pending message generation",
      referenceId: pendingAssistantMessage.id,
      referenceType: "refund",
    })

    return null
  }
}

export async function applyPaidPayment(payment: PaymentRow) {
  const admin = createAdminClient()
  const alreadyCredited = await hasPurchaseLedger(payment.id)

  if (!alreadyCredited) {
    await purchaseCredits(userIdOrThrow(payment), payment.credits_to_add, {
      note: `Mayar top up ${payment.package_code}`,
      referenceId: payment.id,
      referenceType: "payment",
    })
  }

  const { error } = await admin
    .from("payments")
    .update({
      paid_at: new Date().toISOString(),
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)

  if (error) {
    throw error
  }

  await processAwaitingPaymentMessage(userIdOrThrow(payment))
}

function userIdOrThrow(payment: PaymentRow) {
  if (!payment.user_id) {
    throw new Error("Payment is missing user_id")
  }

  return payment.user_id
}

export async function markPaymentState(
  paymentId: string,
  status: "expired" | "failed" | "paid",
) {
  const admin = createAdminClient()
  const updates =
    status === "paid"
      ? {
          paid_at: new Date().toISOString(),
          status,
          updated_at: new Date().toISOString(),
        }
      : {
          status,
          updated_at: new Date().toISOString(),
        }

  const { error } = await admin.from("payments").update(updates).eq("id", paymentId)

  if (error) {
    throw error
  }
}
