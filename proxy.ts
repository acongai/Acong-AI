import { NextResponse, type NextRequest } from "next/server"

import { ensureAccountSetup } from "@/lib/auth/session"
import { SIGNUP_FINGERPRINT_COOKIE } from "@/lib/utils/fingerprint"
import { updateSession } from "@/supabase/middleware"

const PUBLIC_PATHS = ["/auth/callback"]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const { response, user } = await updateSession(request)

  if (!user) {
    return response
  }

  await ensureAccountSetup({
    user,
    request,
  })

  response.cookies.delete(SIGNUP_FINGERPRINT_COOKIE)

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
