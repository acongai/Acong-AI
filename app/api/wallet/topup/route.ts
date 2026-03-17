import { NextResponse } from "next/server"

import { purchaseCredits } from "@/lib/billing/credits"
import { createAdminClient } from "@/lib/db/client"
import { createClient } from "@/supabase/server"

const PLAN_CONFIG: Record<string, { credits: number; plan: string }> = {
  basic: { credits: 100, plan: "basic" },
  pro: { credits: 200, plan: "pro" },
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { credits?: number; plan?: string }
    const planKey = body.plan

    if (!planKey || !(planKey in PLAN_CONFIG)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const config = PLAN_CONFIG[planKey]

    // TODO: insert Mayar payment flow here before crediting
    // When payment is integrated: verify payment success via Mayar webhook before calling purchaseCredits.
    // This endpoint should only credit after a confirmed payment event.

    await purchaseCredits(user.id, config.credits, {
      note: `Plan topup: ${planKey}`,
      referenceType: "payment",
    })

    const admin = createAdminClient()

    await admin
      .from("profiles")
      .update({
        current_plan: config.plan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    return NextResponse.json({
      success: true,
      plan: config.plan,
      credits: config.credits,
    })
  } catch (error) {
    console.error("topup_route_error", error)

    return NextResponse.json(
      { error: "Top-up gagal, coba lagi" },
      { status: 500 },
    )
  }
}
