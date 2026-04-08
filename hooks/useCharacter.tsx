"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { ACONG_SYSTEM_PROMPT, MPOK_SYSTEM_PROMPT, BABEH_SYSTEM_PROMPT } from "@/lib/ai/persona"

export interface Character {
  id: string
  name: string
  avatarSrc: string // Main avatar (for messages)
  mascots: { src: string; alt: string }[] // For EmptyStateMascot
  systemPrompt: string
  placeholderText: string
}

const CHARACTERS: Character[] = [
  {
    id: "acong",
    name: "Acong",
    avatarSrc: "/images/ACONG BETE.png",
    mascots: [
      { src: "/images/ACONG BETE.png", alt: "Acong bete" },
      { src: "/images/ACONG MARAH.png", alt: "Acong marah" },
      { src: "/images/ACONG NGAMBEK.png", alt: "Acong ngambek" },
    ],
    systemPrompt: ACONG_SYSTEM_PROMPT,
    placeholderText: "Tulis sesuatu. Acong akan jawab, walau kelihatan sangat terpaksa.",
  },
  {
    id: "mpok",
    name: "Mpok",
    avatarSrc: "/images/MPOK ACONG BETE.png",
    mascots: [
      { src: "/images/MPOK ACONG BETE.png", alt: "Mpok bete" },
      { src: "/images/MPOK ACONG CUEK.png", alt: "Mpok cuek" },
      { src: "/images/MPOK ACONG KASIAN.png", alt: "Mpok kasian" },
    ],
    systemPrompt: MPOK_SYSTEM_PROMPT,
    placeholderText: "Mau nanya apa lu, Tong? Mpok lagi sibuk nih.",
  },
  {
    id: "babeh",
    name: "Babeh",
    avatarSrc: "/images/BAPAK ACONG NORMAL.png",
    mascots: [
      { src: "/images/BAPAK ACONG NORMAL.png", alt: "Babeh normal" },
      { src: "/images/BAPAK ACONG CERUTU.png", alt: "Babeh ngerokok" },
      { src: "/images/BAPAK ACONG NYENGIR.png", alt: "Babeh nyengir" },
    ],
    systemPrompt: BABEH_SYSTEM_PROMPT,
    placeholderText: "Oi, mau nanya apa? Jangan ribet-ribet ya.",
  },
]

interface CharacterContextType {
  activeCharacter: Character
  characters: Character[]
  switchCharacter: (direction: "next" | "prev") => void
  setActiveCharacterById: (id: string) => void
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined)

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("acong_active_character")
      if (saved && CHARACTERS.find(c => c.id === saved)) {
        return saved
      }
    }
    return "acong"
  })

  const activeCharacter = CHARACTERS.find((c) => c.id === activeId) || CHARACTERS[0]

  const switchCharacter = (direction: "next" | "prev") => {
    const currentIndex = CHARACTERS.findIndex((c) => c.id === activeId)
    let nextIndex = 0
    if (direction === "next") {
      nextIndex = (currentIndex + 1) % CHARACTERS.length
    } else {
      nextIndex = (currentIndex - 1 + CHARACTERS.length) % CHARACTERS.length
    }
    const nextChar = CHARACTERS[nextIndex]
    setActiveId(nextChar.id)
    localStorage.setItem("acong_active_character", nextChar.id)
  }

  const setActiveCharacterById = (id: string) => {
    if (CHARACTERS.find(c => c.id === id)) {
      setActiveId(id)
      localStorage.setItem("acong_active_character", id)
    }
  }

  return (
    <CharacterContext.Provider
      value={{
        activeCharacter,
        characters: CHARACTERS,
        switchCharacter,
        setActiveCharacterById,
      }}
    >
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const context = useContext(CharacterContext)
  if (!context) {
    throw new Error("useCharacter must be used within a CharacterProvider")
  }
  return context
}
