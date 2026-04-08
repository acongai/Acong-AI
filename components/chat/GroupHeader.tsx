"use client"

import { useCharacter } from "@/hooks/useCharacter"
import { useThread } from "@/hooks/useThread"
import { Users, UserMinus, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/supabase/client"
import { toast } from "sonner"

interface GroupHeaderProps {
  threadId: string
  memberIds: string[]
  kickedIds: string[]
  refresh: () => Promise<void>
}

export function GroupHeader({ threadId, memberIds, kickedIds, refresh }: GroupHeaderProps) {
  const { characters } = useCharacter()
  const supabase = createClient()

  const handleKick = async (id: string) => {
    const newKicked = [...kickedIds, id]
    const { error } = await supabase
      .from("chat_threads")
      .update({ metadata: { memberIds, kickedIds: newKicked } })
      .eq("id", threadId)
    
    if (error) toast.error("Gagal nge-kick dia.")
    else {
      toast.success(`${id.toUpperCase()} udah di-kick!`)
      await refresh()
    }
  }

  const handleReAdd = async (id: string) => {
    const newKicked = kickedIds.filter(kid => kid !== id)
    const { error } = await supabase
      .from("chat_threads")
      .update({ metadata: { memberIds, kickedIds: newKicked } })
      .eq("id", threadId)
    
    if (error) toast.error("Gagal manggil balik.")
    else {
      toast.success(`${id.toUpperCase()} balik lagi ke grup!`)
      await refresh()
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 py-2 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-tight">Ghibah Grup</span>
        </div>

        <div className="flex -space-x-4">
          {memberIds.map(id => {
            const char = characters.find(c => c.id === id)
            const isKicked = kickedIds.includes(id)
            
            return (
              <motion.div 
                key={id}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all ${isKicked ? 'opacity-30 grayscale' : ''}`}
                style={{ zIndex: 10 }}
              >
                <img src={char?.avatarSrc} className="h-full w-full rounded-full object-cover" alt={id} title={id} />
                
                <button
                  onClick={() => isKicked ? handleReAdd(id) : handleKick(id)}
                  className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white dark:border-zinc-900 bg-[var(--card)] shadow-sm transition-transform hover:scale-110`}
                >
                  {isKicked ? (
                    <UserPlus className="h-2 w-2 text-green-500" />
                  ) : (
                    <UserMinus className="h-2 w-2 text-red-500" />
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
