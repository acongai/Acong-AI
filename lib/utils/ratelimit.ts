type RateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitStore = Map<string, RateLimitBucket>

declare global {
  var __acongRateLimitStore: RateLimitStore | undefined
}

function getStore() {
  if (!globalThis.__acongRateLimitStore) {
    globalThis.__acongRateLimitStore = new Map()
  }

  return globalThis.__acongRateLimitStore
}

export function getClientIp(
  request: Request | { headers: Headers },
): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null
  }

  return request.headers.get("x-real-ip")
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string
  limit: number
  windowMs: number
}) {
  const store = getStore()
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    }
  }

  current.count += 1
  store.set(key, current)

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  }
}
