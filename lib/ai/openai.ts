import OpenAI from "openai"

interface OpenAIConversationMessage {
  content: string
  role: "assistant" | "user"
}

interface GenerateTextParams {
  conversation: OpenAIConversationMessage[]
  systemPrompt: string
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY")
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function generateTextResponse({
  conversation,
  systemPrompt,
}: GenerateTextParams) {
  const client = getOpenAIClient()
  const response = await client.responses.create({
    model: "gpt-4o-mini",
    instructions: systemPrompt,
    input: conversation.map((message) => ({
      role: message.role,
      content: [
        {
          type: "input_text",
          text: message.content,
        },
      ],
    })),
    max_output_tokens: 400,
    temperature: 0.9,
  })

  const text = response.output_text?.trim()

  if (!text) {
    throw new Error("OpenAI returned an empty response")
  }

  return {
    requestId: response._request_id ?? null,
    text,
  }
}
