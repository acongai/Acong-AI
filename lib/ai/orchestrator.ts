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

function sanitizePromptValue(value: string): string {
  return value
    .replace(/[\r\n]/g, " ")
    .replace(/\0/g, "")
    .trim()
    .slice(0, 50)
}

export async function orchestrateTextReply({
  history,
  userInput,
  locale = "id",
  characterId = "acong",
  groupMemberIds = [],
  kickedIds = [],
  userName,
  userGender,
  localTime,
  roundContext = [],
}: {
  history: OrchestratorMessage[]
  userInput: string
  locale?: "id" | "en"
  characterId?: string
  groupMemberIds?: string[]
  kickedIds?: string[]
  userName?: string
  userGender?: "male" | "female"
  localTime?: string
  roundContext?: { characterId: string; text: string }[]
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

  const safeUserName = userName ? sanitizePromptValue(userName) : undefined
  const safeUserGender = userGender ? sanitizePromptValue(userGender) : undefined
  const safeLocalTime = localTime ? sanitizePromptValue(localTime) : undefined

  // Inject local time
  if (safeLocalTime) {
    systemPrompt += `\n\nSekarang jam ${safeLocalTime} waktu lokal user. Kamu bisa bereaksi ke waktu ini secara natural kalau relevan — tapi jangan dipaksain.`
  }

  // Personalized rules based on persona
  if (characterId === 'acong') {
    systemPrompt += `\n\nHARD RULE: Jangan pernah manggil user pake nama. Pake 'lo/gw' aja. Titik.`
  } else if (safeUserName && (characterId === 'mpok' || characterId === 'babeh')) {
    const address = safeUserGender === 'male' ? 'tong' : 'neng'
    systemPrompt += `\n\nInstruksi Tambahan: Panggil user sesekali pake namanya (${safeUserName}) atau '${address}'.`
  }

  if (groupMemberIds && groupMemberIds.length > 0) {
    // Enhancement 3: members aware of current group state
    const activeNames = groupMemberIds.map(id => id === 'acong' ? 'Acong' : id === 'mpok' ? 'Mpok' : 'Babeh').join(', ')
    const kickedNames = kickedIds.length > 0
      ? kickedIds.map(id => id === 'acong' ? 'Acong' : id === 'mpok' ? 'Mpok' : 'Babeh').join(', ')
      : null

    systemPrompt += `\n\nAnggota grup yang aktif saat ini: ${activeNames}. User ini namanya ${safeUserName || 'User'}, gendernya ${safeUserGender || 'unknown'}.`
    if (kickedNames) {
      systemPrompt += ` ${kickedNames} udah dikeluarin dari grup — kamu tau ini dan nggak perlu nunggu atau nyebut-nyebut mereka lagi.`
    }
    systemPrompt += ` Jawab ke user, bukan ngobrol langsung ke sesama karakter. Jawab sekali aja, jangan balas lagi setelah giliranmu selesai.`

    // Enhancement 2: inject previous characters' responses this round
    if (roundContext.length > 0) {
      const roundSummary = roundContext
        .map(r => {
          const name = r.characterId === 'acong' ? 'Acong' : r.characterId === 'mpok' ? 'Mpok' : 'Babeh'
          return `${name}: "${r.text}"`
        })
        .join('\n')
      systemPrompt += `\n\nIni grup chat. Di ronde ini, karakter lain udah jawab duluan:\n${roundSummary}\n\nKamu bisa acknowledge, setuju, atau bereaksi ke jawaban mereka secara natural — tapi jangan copy atau ulangi poin yang sama. Kalau udah dijawab lengkap, cukup nambahin, nyahut, atau komentar singkat. Tetap jaga karakter dan gaya lo sendiri.`
    }
  }

  if (locale === "en") {
    systemPrompt += `\n\nThe user has switched to English. You must respond in English only, while maintaining your character personality.`
  }

  const conversation: OrchestratorMessage[] = [
    ...history.slice(-10),
    { role: "user", content: userInput },
  ]
  const response = await generateTextResponse({
    conversation,
    systemPrompt,
    characterId,
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
