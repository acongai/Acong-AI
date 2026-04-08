import { useCharacter } from "@/hooks/useCharacter"
import { useThread } from "@/hooks/useThread"
import { Users, UserMinus, UserPlus, Edit3, Check, X as CloseIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/supabase/client"
import { toast } from "sonner"
import { useState, useRef, useEffect } from "react"
import { useLanguage } from "@/hooks/useLanguage"

interface GroupHeaderProps {
  threadId: string
  title: string
  memberIds: string[]
  kickedIds: string[]
  refresh: () => Promise<void>
}

export function GroupHeader({ threadId, title, memberIds, kickedIds, refresh }: GroupHeaderProps) {
  const { characters } = useCharacter()
  const { copy } = useLanguage()
  const supabase = createClient()
  
  const [isEditing, setIsEditing] = useState(false)
  const [newTitle, setNewTitle] = useState(title)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus()
    }
  }, [isEditing])

  const handleKick = async (id: string) => {
    const newKicked = [...kickedIds, id]
    const { error } = await supabase
      .from("chat_threads")
      .update({ metadata: { memberIds, kickedIds: newKicked } })
      .eq("id", threadId)
    
    if (error) toast.error(copy.groupHeader.kickError)
    else {
      toast.success(`${id.toUpperCase()} ${copy.groupHeader.kickSuccess}`)
      await refresh()
    }
  }

  const handleReAdd = async (id: string) => {
    const newKicked = kickedIds.filter(kid => kid !== id)
    const { error } = await supabase
      .from("chat_threads")
      .update({ metadata: { memberIds, kickedIds: newKicked } })
      .eq("id", threadId)
    
    if (error) toast.error(copy.groupHeader.reAddError)
    else {
      toast.success(`${id.toUpperCase()} ${copy.groupHeader.reAddSuccess}`)
      await refresh()
    }
  }

  const handleRename = async () => {
    if (!newTitle.trim() || newTitle === title) {
      setIsEditing(false)
      return
    }

    const { error } = await supabase
      .from("chat_threads")
      .update({ title: newTitle.trim() })
      .eq("id", threadId)

    if (error) {
      toast.error("Failed to rename group")
    } else {
      await refresh()
      setIsEditing(false)
    }
  }

  return (
    <div className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 py-2 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Dynamic Overlap Display */}
        <div className="relative flex h-10 w-16">
          {/* Mpok Left */}
          {memberIds.includes('mpok') && !kickedIds.includes('mpok') && (
            <div className="absolute left-0 bottom-0 z-10 h-8 w-8 -rotate-12 transform overflow-hidden rounded-full border-2 border-[var(--background)] bg-[var(--card)] shadow-lg transition-transform hover:scale-110">
              <img src={characters.find(c => c.id === 'mpok')?.avatarSrc} className="h-full w-full object-cover" alt="Mpok" />
            </div>
          )}
          {/* Acong Center (Raised) */}
          {memberIds.includes('acong') && !kickedIds.includes('acong') && (
            <div className="absolute left-4 top-0 z-30 h-9 w-9 overflow-hidden rounded-full border-2 border-[var(--background)] bg-[var(--card)] shadow-xl transition-transform hover:scale-110">
              <img src={characters.find(c => c.id === 'acong')?.avatarSrc} className="h-full w-full object-cover" alt="Acong" />
            </div>
          )}
          {/* Babeh Right */}
          {memberIds.includes('babeh') && !kickedIds.includes('babeh') && (
            <div className="absolute left-8 bottom-0 z-20 h-8 w-8 rotate-12 transform overflow-hidden rounded-full border-2 border-[var(--background)] bg-[var(--card)] shadow-lg transition-transform hover:scale-110">
              <img src={characters.find(c => c.id === 'babeh')?.avatarSrc} className="h-full w-full object-cover" alt="Babeh" />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  ref={editInputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setIsEditing(false)
                  }}
                  className="h-7 min-w-[200px] rounded border border-[var(--border)] bg-[var(--background)] px-2 text-sm font-bold text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <button onClick={handleRename} className="p-1 text-green-500 hover:text-green-600">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setIsEditing(false)} className="p-1 text-red-500 hover:text-red-600">
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div 
                className="group flex cursor-pointer items-center gap-2"
                onClick={() => setIsEditing(true)}
              >
                <h1 className="text-sm font-bold text-[var(--foreground)]">{title}</h1>
                <Edit3 className="h-3 w-3 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participant List - Moved to center visually */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
        {memberIds.map(id => {
          const char = characters.find(c => c.id === id)
          const isKicked = kickedIds.includes(id)
          
          return (
            <motion.div 
              key={id}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all ${isKicked ? 'opacity-30 grayscale' : ''}`}
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
      <div></div>
    </div>
  )
}
