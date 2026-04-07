import { ACONG_SYSTEM_PROMPT, ACONG_SYSTEM_PROMPT_EN } from "@/lib/ai/persona"
import { type GeminiUsageMetadata, generateTextResponse } from "@/lib/ai/gemini"
import {
  computeTypoScore,
  getTypoRoastInstruction,
  shouldRoastTypo,
} from "@/lib/ai/typo"

export interface OrchestratorMessage {
  content: string
  role: "assistant" | "user"
}

export interface OrchestratorResult {
  meta: {
    finishMessage: string | null
    finishReason: string | null
    isTruncated: boolean
    requestId: string | null
    responseId: string | null
    roastApplied: boolean
    typoScore: number
    usageMetadata: GeminiUsageMetadata | null
  }
  outputText: string
  outputType: "text"
}

export async function orchestrateTextReply({
  history,
  userInput,
  locale = "id",
}: {
  history: OrchestratorMessage[]
  userInput: string
  locale?: "id" | "en"
}): Promise<OrchestratorResult> {
  const typoScore = computeTypoScore(userInput)
  const roastApplied = shouldRoastTypo(typoScore)
  const basePrompt = locale === "en" ? ACONG_SYSTEM_PROMPT_EN : ACONG_SYSTEM_PROMPT
  const systemPrompt = roastApplied
    ? `${basePrompt}\n\n${locale === "en" ? "Additional instruction:\n- " : "Instruksi tambahan:\n- "}${getTypoRoastInstruction(locale)}`
    : basePrompt

  const conversation: OrchestratorMessage[] = [
    ...history.slice(-10),
    { role: "user", content: userInput },
  ]
  const response = await generateTextResponse({
    conversation,
    systemPrompt,
  })

  return {
    meta: {
      finishMessage: response.finishMessage,
      finishReason: response.finishReason,
      isTruncated: response.isTruncated,
      requestId: response.requestId,
      responseId: response.responseId,
      roastApplied,
      typoScore,
      usageMetadata: response.usageMetadata,
    },
    outputText: response.text,
    outputType: "text",
  }
}
