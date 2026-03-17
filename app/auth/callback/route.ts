import { NextResponse } from "next/server"

import { sanitizeAuthNextPath } from "@/lib/auth/redirect"
import { createClient } from "@/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = sanitizeAuthNextPath(requestUrl.searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  const failureUrl = new URL(next, requestUrl.origin)
  failureUrl.searchParams.set("auth_error", "callback_failed")
  failureUrl.searchParams.set("login", "1")

  return NextResponse.redirect(failureUrl)
}
