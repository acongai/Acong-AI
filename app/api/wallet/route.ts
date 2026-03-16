import { NextResponse } from "next/server"

import { getWalletSummary } from "@/lib/billing/wallet"
import { COPY } from "@/lib/copy"
import { createClient } from "@/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: COPY.api.walletUnauthorized,
        },
        { status: 401 },
      )
    }

    const wallet = await getWalletSummary(user.id)

    return NextResponse.json(wallet)
  } catch (error) {
    console.error("wallet_route_error", error)

    return NextResponse.json(
      {
        error: COPY.api.walletGeneric,
      },
      { status: 500 },
    )
  }
}
