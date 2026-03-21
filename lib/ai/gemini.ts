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
}

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY")
  }
  return key
}

const RETRY_DELAYS_MS = [1000, 2000, 3000]

function isOverloaded(status: number, message: string | undefined): boolean {
  return status === 503 || (message?.toLowerCase().includes("high demand") ?? false)
}

export async function generateTextResponse({
  conversation,
  systemPrompt,
}: GenerateTextParams) {
  const apiKey = getApiKey()
  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

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
      maxOutputTokens: 300,
      temperature: 1.0,
      topP: 0.95,
      topK: 40,
    },
    safetySettings: SAFETY_SETTINGS,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; thought?: boolean }>
        }
      }>
      error?: { message?: string }
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

    const parts = payload.candidates?.[0]?.content?.parts ?? []
    const text = parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim()

    if (!text) {
      throw new Error("Gemini returned an empty response")
    }

    return {
      requestId: null,
      text,
    }
  }

  throw lastError ?? new Error("Gemini API error")
}
