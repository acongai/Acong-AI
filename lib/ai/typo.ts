export function computeTypoScore(input: string): number {
  let score = 0
  // repeated characters (e.g. "kenaaapaaaa")
  if (/(.)\1{3,}/.test(input)) score += 3
  // all caps
  if (input === input.toUpperCase() && input.length > 5) score += 2
  // mostly symbols or numbers
  if ((input.match(/[^a-zA-Z\s]/g) || []).length > input.length * 0.5) score += 2
  // very short gibberish (under 4 chars, non-word)
  if (input.length < 4 && !/\w+/.test(input)) score += 2
  return score
}

export function shouldRoastTypo(score: number): boolean {
  return score >= 3
}

export function getTypoRoastInstruction(locale: "id" | "en" = "id"): string {
  if (locale === "en") {
    const lines = [
      "Before answering, roast their typo or typing style with one short sarcastic sentence.",
      "Start your answer with one short sentence questioning their ability to type, then answer the question.",
      "Drop one quick insult about their messy input, then answer.",
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  }

  const lines = [
    "Sebelum menjawab, komentari typo atau cara ngetik user dengan satu kalimat singkat yang sarkastis.",
    "Mulai jawaban dengan satu kalimat pendek yang mempertanyakan cara user mengetik, lalu jawab pertanyaannya.",
    "Beri satu komentar singkat soal input yang berantakan ini, lalu jawab.",
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}
