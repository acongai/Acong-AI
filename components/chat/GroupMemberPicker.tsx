"use client"

import { useState } from "react"
import { Users, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { useCharacter, type Character } from "@/hooks/useCharacter"

interface GroupMemberPickerProps {
  onConfirm: (selectedIds: string[]) => void
  onClose: () => void
}

export function GroupMemberPicker({ onConfirm, onClose }: GroupMemberPickerProps) {
  const { characters } = useCharacter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    if (selectedIds.length >= 2) {
      onConfirm(selectedIds)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)]">
            <Users className="h-6 w-6 text-[var(--foreground)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Bikin Grup Chat</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Pilih minimal 2 tokoh buat diajak ghibah bareng.</p>
        </div>

        <div className="space-y-3">
          {characters.map((char) => {
            const isSelected = selectedIds.includes(char.id)
            return (
              <button
                key={char.id}
                onClick={() => toggleMember(char.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 transition-all ${
                  isSelected 
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm" 
                    : "border-[var(--border)] hover:bg-[var(--secondary)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--secondary)]">
                    <img src={char.avatarSrc} alt={char.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--foreground)]">{char.name}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">Keluarga Acong</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 rounded-xl"
            onClick={onClose}
          >
            Nggak jadi
          </Button>
          <Button
            className="flex-1 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]"
            disabled={selectedIds.length < 2}
            onClick={handleConfirm}
          >
            Bikin Grup!
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
