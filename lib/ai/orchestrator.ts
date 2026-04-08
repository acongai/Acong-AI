import {
  ACONG_SYSTEM_PROMPT,
  ACONG_SYSTEM_PROMPT_EN,
  MPOK_SYSTEM_PROMPT,
  MPOK_SYSTEM_PROMPT_EN,
  BABEH_SYSTEM_PROMPT,
  BABEH_SYSTEM_PROMPT_EN,
} from "@/lib/ai/persona"
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
  characterId = "acong",
  groupMemberIds = [],
}: {
  history: OrchestratorMessage[]
  userInput: string
  locale?: "id" | "en"
  characterId?: string
  groupMemberIds?: string[]
}): Promise<OrchestratorResult> {
  const typoScore = computeTypoScore(userInput)
  const roastApplied = shouldRoastTypo(typoScore)

  let basePrompt = locale === "en" ? ACONG_SYSTEM_PROMPT_EN : ACONG_SYSTEM_PROMPT
  if (characterId === "mpok") {
    basePrompt = locale === "en" ? MPOK_SYSTEM_PROMPT_EN : MPOK_SYSTEM_PROMPT
  } else if (characterId === "babeh") {
    basePrompt = locale === "en" ? BABEH_SYSTEM_PROMPT_EN : BABEH_SYSTEM_PROMPT
  }

  let systemPrompt = roastApplied
    ? `${basePrompt}\n\n${locale === "en" ? "Additional instruction:\n- " : "Instruksi tambahan:\n- "}${getTypoRoastInstruction(locale)}`
    : basePrompt

  if (groupMemberIds && groupMemberIds.length > 0) {
    const memberNames = groupMemberIds.map(id => id === 'acong' ? 'Acong' : id === 'mpok' ? 'Mpok' : 'Babeh').join(', ')
    systemPrompt += `\n\nKamu lagi di grup chat bareng: ${memberNames}. Jawab sesuai kepribadian lu dan konteks grup.`
  }

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

export async function routeGroupChat({
  userInput,
  activeMemberIds,
}: {
  userInput: string
  activeMemberIds: string[]
}): Promise<string[]> {
  const systemPrompt = `Given this user message, order these characters by who would most naturally respond first based on their personality. Return only a JSON array of character ids, nothing else. Available ids: ${activeMemberIds.join(", ")}`
  
  const response = await generateTextResponse({
    conversation: [{ role: "user", content: userInput }],
    systemPrompt,
  })

  try {
    const cleaned = response.text.replace(/```json|```/g, "").trim()
    const order = JSON.parse(cleaned) as string[]
    return order.filter(id => activeMemberIds.includes(id))
  } catch (e) {
    return activeMemberIds
  }
}
