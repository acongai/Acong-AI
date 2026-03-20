import { NextResponse } from "next/server"

import {
  applyPaidPayment,
  confirmMayarTransactionPaid,
} from "@/lib/billing/mayar"
import { createAdminClient } from "@/lib/db/client"
import type { PaymentRow } from "@/lib/db/types"
import { createClient } from "@/supabase/server"

export async function POST(request: Request) {
  void request

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    const payments = (data ?? []) as PaymentRow[]

    if (payments.length === 0) {
      return NextResponse.json({ status: "no_pending" })
    }

    for (const payment of payments) {
      if (payment.status === "paid") {
        await applyPaidPayment(payment)
        return NextResponse.json({ status: "already_credited" })
      }

      const invoiceId = payment.external_invoice_id ?? payment.external_payment_id

      if (!invoiceId) {
        continue
      }

      const confirmed = await confirmMayarTransactionPaid(invoiceId)

      if (!confirmed) {
        continue
      }

      await applyPaidPayment(payment)

      return NextResponse.json({ status: "credited" })
    }

    return NextResponse.json({ status: "not_paid" })
  } catch (error) {
    console.error("payments_verify_error", error)
    return NextResponse.json({ error: "Gagal verifikasi" }, { status: 500 })
  }
}
