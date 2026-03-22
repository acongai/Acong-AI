import { ACONG_SYSTEM_PROMPT } from "@/lib/ai/persona"
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
}: {
  history: OrchestratorMessage[]
  userInput: string
}): Promise<OrchestratorResult> {
  const typoScore = computeTypoScore(userInput)
  const roastApplied = shouldRoastTypo(typoScore)
  const systemPrompt = roastApplied
    ? `${ACONG_SYSTEM_PROMPT}\n\nInstruksi tambahan:\n- ${getTypoRoastInstruction()}`
    : ACONG_SYSTEM_PROMPT

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
