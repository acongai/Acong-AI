const GEMINI_MODEL = "gemini-2.5-flash-lite-preview-06-17"
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
      maxOutputTokens: 400,
      temperature: 0.9,
    },
    safetySettings: SAFETY_SETTINGS,
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini API error")
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!text) {
    throw new Error("Gemini returned an empty response")
  }

  return {
    requestId: null,
    text,
  }
}
