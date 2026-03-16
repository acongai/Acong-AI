export const SIGNUP_FINGERPRINT_COOKIE = "acong-signup-fingerprint"

export interface BrowserFingerprintDetails {
  userAgent: string
  language: string
  platform: string
  screen: string
}

export interface BrowserFingerprintPayload {
  value: string
  details: BrowserFingerprintDetails
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", bytes)

  return Array.from(new Uint8Array(hash))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
}

export async function collectBrowserFingerprint(): Promise<BrowserFingerprintPayload> {
  if (typeof window === "undefined") {
    throw new Error("Browser fingerprinting is only available in the browser")
  }

  const details: BrowserFingerprintDetails = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${window.screen.width}x${window.screen.height}`,
  }

  const signature = [
    details.userAgent,
    details.language,
    details.platform,
    details.screen,
  ].join("|")

  return {
    value: await sha256Hex(signature),
    details,
  }
}

export function serializeFingerprintCookie(
  payload: BrowserFingerprintPayload,
): string {
  return encodeURIComponent(JSON.stringify(payload))
}

export function parseFingerprintCookie(
  value: string | undefined,
): BrowserFingerprintPayload | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as BrowserFingerprintPayload
  } catch {
    return null
  }
}
