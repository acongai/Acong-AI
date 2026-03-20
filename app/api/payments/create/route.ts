import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createMayarInvoice,
  getMayarPackages,
} from "@/lib/billing/mayar"
import { getCreditPackage } from "@/lib/billing/wallet"
import { COPY } from "@/lib/copy"
import { createAdminClient } from "@/lib/db/client"
import type { PaymentRow } from "@/lib/db/types"
import { createClient } from "@/supabase/server"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const createPaymentSchema = z.object({
  packageCode: z.enum(["package_basic", "package_pro"]),
  threadId: z.string().uuid().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: COPY.api.paymentUnauthorized,
        },
        { status: 401 },
      )
    }

    const rateLimit = checkRateLimit({
      key: `payments:create:${user.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: COPY.api.paymentRateLimit,
        },
        { status: 429 },
      )
    }

    const rawBody = await request.json().catch(() => null)
    const parsedBody = createPaymentSchema.safeParse(rawBody)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: COPY.api.paymentInvalidPackage,
        },
        { status: 400 },
      )
    }

    const packageConfig = getCreditPackage(parsedBody.data.packageCode)

    if (!packageConfig) {
      return NextResponse.json(
        {
          error: COPY.api.paymentInvalidPackage,
        },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { data: paymentData, error: paymentInsertError } = await admin
      .from("payments")
      .insert({
        amount_idr: packageConfig.priceIdr,
        credits_to_add: packageConfig.credits,
        package_code: packageConfig.code,
        provider: "mayar",
        status: "pending",
        user_id: user.id,
      })
      .select("*")
      .single()
    const payment = paymentData as PaymentRow | null

    if (paymentInsertError || !payment) {
      throw paymentInsertError ?? new Error("Payment row was not created")
    }

    const requestOrigin = new URL(request.url).origin
    const appOrigin = requestOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectUrl =
      parsedBody.data.threadId
        ? `${appOrigin}/chat/${parsedBody.data.threadId}`
        : appOrigin

    const invoice = await createMayarInvoice({
      packageConfig,
      paymentId: payment.id,
      redirectUrl,
      threadId: parsedBody.data.threadId,
      user: {
        email: user.email ?? null,
        id: user.id,
      },
    })

    const { error: paymentUpdateError } = await admin
      .from("payments")
      .update({
        external_invoice_id: invoice.externalInvoiceId,
        external_payment_id: invoice.externalPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    if (paymentUpdateError) {
      throw paymentUpdateError
    }

    return NextResponse.json({
      checkoutUrl: invoice.checkoutUrl,
      packages: getMayarPackages(),
      paymentId: payment.id,
    })
  } catch (error) {
    console.error("payments_create_error", error)

    return NextResponse.json(
      {
        error: COPY.api.paymentCreateFailed,
      },
      { status: 500 },
    )
  }
}
