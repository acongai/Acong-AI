const AUTH_UI_QUERY_KEYS = ["auth_error", "login"] as const

export function sanitizeAuthNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/"
  }

  try {
    const normalized = new URL(next, "http://localhost")
    return `${normalized.pathname}${normalized.search}${normalized.hash}` || "/"
  } catch {
    return "/"
  }
}

export function buildAuthCallbackUrl({
  next,
  origin,
}: {
  next: string | null | undefined
  origin: string
}) {
  const callbackUrl = new URL("/auth/callback", origin)
  callbackUrl.searchParams.set("next", sanitizeAuthNextPath(next))
  return callbackUrl.toString()
}

export function getAuthAwareNextPath(input: URL) {
  const cleanedParams = new URLSearchParams(input.searchParams.toString())

  AUTH_UI_QUERY_KEYS.forEach((key) => {
    cleanedParams.delete(key)
  })

  const query = cleanedParams.toString()
  return `${input.pathname}${query ? `?${query}` : ""}${input.hash}` || "/"
}
