const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
]

interface GeminiConversationMessage {
  content: string
  role: "assistant" | "user"
}

interface GenerateTextParams {
  conversation: GeminiConversationMessage[]
  systemPrompt: string
  characterId?: string
}

interface GeminiUsageMetadataPayload {
  cachedContentTokenCount?: number
  candidatesTokenCount?: number
  promptTokenCount?: number
  thoughtsTokenCount?: number
  toolUsePromptTokenCount?: number
  totalTokenCount?: number
}

export interface GeminiUsageMetadata {
  [key: string]: number | null
  cachedContentTokenCount: number | null
  candidatesTokenCount: number | null
  promptTokenCount: number | null
  thoughtsTokenCount: number | null
  toolUsePromptTokenCount: number | null
  totalTokenCount: number | null
}

export interface GeminiResponseMeta {
  finishMessage: string | null
  finishReason: string | null
  isTruncated: boolean
  requestId: string | null
  responseId: string | null
  usageMetadata: GeminiUsageMetadata | null
}

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY")
  }
  return key
}

const RETRY_DELAYS_MS = [1000, 2000, 3000]
const MAX_TOKENS_FINISH_REASONS = new Set([
  "FINISH_REASON_MAX_TOKENS",
  "MAX_TOKENS",
])

function isOverloaded(status: number, message: string | undefined): boolean {
  return status === 503 || (message?.toLowerCase().includes("high demand") ?? false)
}

function normalizeUsageMetadata(
  usageMetadata?: GeminiUsageMetadataPayload,
): GeminiUsageMetadata | null {
  if (!usageMetadata) {
    return null
  }

  return {
    cachedContentTokenCount: usageMetadata.cachedContentTokenCount ?? null,
    candidatesTokenCount: usageMetadata.candidatesTokenCount ?? null,
    promptTokenCount: usageMetadata.promptTokenCount ?? null,
    thoughtsTokenCount: usageMetadata.thoughtsTokenCount ?? null,
    toolUsePromptTokenCount: usageMetadata.toolUsePromptTokenCount ?? null,
    totalTokenCount: usageMetadata.totalTokenCount ?? null,
  }
}

function logGeminiResponse({
  candidateTokenCount,
  meta,
  text,
}: {
  candidateTokenCount: number | null
  meta: GeminiResponseMeta
  text: string
}) {
  console.info("gemini_generate_response", {
    finish_message: meta.finishMessage,
    finish_reason: meta.finishReason,
    is_truncated: meta.isTruncated,
    output_token_count: meta.usageMetadata?.candidatesTokenCount ?? candidateTokenCount,
    response_id: meta.responseId,
    response_text_length: text.length,
    total_token_count: meta.usageMetadata?.totalTokenCount ?? null,
  })

  if (meta.finishReason && meta.finishReason !== "STOP") {
    console.warn("gemini_unexpected_finish_reason", {
      finish_message: meta.finishMessage,
      finish_reason: meta.finishReason,
      response_id: meta.responseId,
    })
  }
}

// Character-appropriate fallback responses when Gemini safety/filter triggers
const SAFETY_FALLBACKS: Record<string, string> = {
  acong: "...gue lagi males ngomong soal itu. Tanya yang lain.",
  mpok: "Aduh, Mpok nggak enak mau bahas yang itu. Ganti topik ya.",
  babeh: "Wah itu mah bukan urusan Babeh. Tanya yang lain aja.",
}

export async function generateTextResponse({
  conversation,
  systemPrompt,
  characterId,
}: GenerateTextParams) {
  const apiKey = getApiKey()
  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`

  // Gemini uses "model" instead of "assistant"
  const contents = conversation.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }))

  const body = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      maxOutputTokens: 500,
      stopSequences: [],
      temperature: 1.0,
      thinkingConfig: { thinkingBudget: 0 },
      topP: 0.95,
      topK: 40,
    },
    safetySettings: SAFETY_SETTINGS,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25_000)
    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Gemini timeout")
      }
      throw err
    }
    clearTimeout(timeoutId)

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; thought?: boolean }>
        }
        finishMessage?: string
        finishReason?: string
        tokenCount?: number
      }>
      error?: { message?: string }
      responseId?: string
      usageMetadata?: GeminiUsageMetadataPayload
    }

    if (!response.ok) {
      const errorMessage = payload.error?.message ?? "Gemini API error"

      if (isOverloaded(response.status, errorMessage) && attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
        lastError = new Error(errorMessage)
        continue
      }

      throw new Error(errorMessage)
    }

    const candidate = payload.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    const text = parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim()
    const finishReason = candidate?.finishReason ?? null
    const meta: GeminiResponseMeta = {
      finishMessage: candidate?.finishMessage ?? null,
      finishReason,
      isTruncated: finishReason ? MAX_TOKENS_FINISH_REASONS.has(finishReason) : false,
      requestId: payload.responseId ?? null,
      responseId: payload.responseId ?? null,
      usageMetadata: normalizeUsageMetadata(payload.usageMetadata),
    }

    logGeminiResponse({
      candidateTokenCount: candidate?.tokenCount ?? null,
      meta,
      text,
    })

    if (!text || finishReason === "SAFETY" || finishReason === "OTHER") {
      const fallbackCharId = characterId ?? "acong"
      const fallbackText = SAFETY_FALLBACKS[fallbackCharId] ?? SAFETY_FALLBACKS["acong"]
      console.warn("[gemini] empty/safety response — using fallback", {
        characterId: fallbackCharId,
        finishReason,
        finishMessage: meta.finishMessage,
        textLength: text.length,
        responseId: meta.responseId,
        promptTokenCount: meta.usageMetadata?.promptTokenCount,
        totalTokenCount: meta.usageMetadata?.totalTokenCount,
      })
      return {
        finishMessage: meta.finishMessage,
        finishReason: meta.finishReason,
        isTruncated: false,
        requestId: meta.requestId,
        responseId: meta.responseId,
        text: fallbackText,
        usageMetadata: meta.usageMetadata,
      }
    }

    return {
      finishMessage: meta.finishMessage,
      finishReason: meta.finishReason,
      isTruncated: meta.isTruncated,
      requestId: meta.requestId,
      responseId: meta.responseId,
      text,
      usageMetadata: meta.usageMetadata,
    }
  }

  throw lastError ?? new Error("Gemini API error")
}
