import { NextResponse } from "next/server"

import {
  applyPaidPayment,
  confirmMayarTransactionPaid,
  findPaymentByExternalReference,
  markPaymentState,
  parseMayarWebhookEvent,
} from "@/lib/billing/mayar"
import { COPY } from "@/lib/copy"
import { createAdminClient } from "@/lib/db/client"
import type { Json, PaymentEventInsert, PaymentEventRow } from "@/lib/db/types"

export async function POST(request: Request) {
  const rawBody = await request.text()

  try {
    const payload = JSON.parse(rawBody) as unknown
    const parsedEvent = parseMayarWebhookEvent(payload as never)
    const admin = createAdminClient()

    const { data: existingEvent, error: existingEventError } = await admin
      .from("payment_events")
      .select("*")
      .eq("external_event_id", parsedEvent.externalEventId)
      .maybeSingle()
    const paymentEvent = existingEvent as PaymentEventRow | null

    if (existingEventError) {
      throw existingEventError
    }

    if (paymentEvent?.processed) {
      return NextResponse.json({ ok: true })
    }

    if (!paymentEvent) {
      const eventInsert: PaymentEventInsert = {
        event_type: parsedEvent.eventType,
        external_event_id: parsedEvent.externalEventId,
        payload: payload as Json,
        processed: false,
        provider: "mayar",
      }

      const { error: eventInsertError } = await admin
        .from("payment_events")
        .insert(eventInsert)

      if (eventInsertError) {
        throw eventInsertError
      }
    }

    const payment = await findPaymentByExternalReference({
      externalInvoiceId: parsedEvent.externalInvoiceId,
      externalPaymentId: parsedEvent.externalPaymentId,
    })

    if (!payment) {
      return NextResponse.json({ ok: true })
    }

    const { error: linkEventError } = await admin
      .from("payment_events")
      .update({
        payment_id: payment.id,
      })
      .eq("external_event_id", parsedEvent.externalEventId)

    if (linkEventError) {
      throw linkEventError
    }

    if (parsedEvent.paymentState === "paid") {
      const invoiceId = parsedEvent.externalInvoiceId ?? parsedEvent.externalPaymentId
      const confirmed = invoiceId ? await confirmMayarTransactionPaid(invoiceId) : false

      if (!confirmed) {
        console.warn("payments_mayar_webhook_unconfirmed", {
          external_event_id: parsedEvent.externalEventId,
          invoice_id: invoiceId,
        })
        return NextResponse.json({ error: COPY.api.webhookGeneric }, { status: 402 })
      }

      await applyPaidPayment(payment)
    } else if (parsedEvent.paymentState === "failed") {
      await markPaymentState(payment.id, "failed")
    } else if (parsedEvent.paymentState === "expired") {
      await markPaymentState(payment.id, "expired")
    }

    const { error: markProcessedError } = await admin
      .from("payment_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("external_event_id", parsedEvent.externalEventId)

    if (markProcessedError) {
      throw markProcessedError
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("payments_mayar_webhook_error", error)

    return NextResponse.json(
      {
        error: COPY.api.webhookGeneric,
      },
      { status: 500 },
    )
  }
}
