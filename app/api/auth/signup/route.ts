import { NextResponse } from "next/server"
import { z } from "zod"

import { COPY } from "@/lib/copy"
import { createAdminClient } from "@/lib/db/client"

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
})

function getSignupErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("user already exists")
  ) {
    return COPY.dialogs.signupExistsError
  }

  return COPY.dialogs.signupError
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null)
  const parsedBody = signupSchema.safeParse(rawBody)

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: COPY.dialogs.signupInvalid,
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { email, password } = parsedBody.data
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  })

  if (error) {
    return NextResponse.json(
      {
        error: getSignupErrorMessage(error.message),
      },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
  })
}
