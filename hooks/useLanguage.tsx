"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { COPY } from "@/lib/copy"
import { COPY_EN } from "@/lib/copy-en"

type Locale = "id" | "en"

interface LanguageContextType {
  locale: Locale
  copy: typeof COPY
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document !== "undefined") {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith("NEXT_LOCALE="))
        ?.split("=")[1] as Locale | undefined

      if (cookieValue === "id" || cookieValue === "en") {
        return cookieValue
      }
    }
    return "id"
  })

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    // Refresh to apply changes everywhere (easier than refactoring every single component to be reactive to context if needed)
    window.location.reload()
  }

  const copy = locale === "en" ? (COPY_EN as unknown as typeof COPY) : COPY

  return (
    <LanguageContext.Provider value={{ locale, copy, setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
