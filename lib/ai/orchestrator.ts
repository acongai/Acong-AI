import { ACONG_SYSTEM_PROMPT } from "@/lib/ai/persona"
import { generateTextResponse } from "@/lib/ai/openai"
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
    requestId: string | null
    roastApplied: boolean
    typoScore: number
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
      requestId: response.requestId,
      roastApplied,
      typoScore,
    },
    outputText: response.text,
    outputType: "text",
  }
}
