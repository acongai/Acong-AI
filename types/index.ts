import type { ChatMessageStatus, ChatRole } from "@/lib/db/types"

export interface AppAttachment {
  id: string
  fileType: "image"
  url: string
  fileName?: string
  mimeType?: string
}

export interface AppMessage {
  id: string
  role: ChatRole
  content: string
  createdAt?: string
  status?: ChatMessageStatus
  attachments?: AppAttachment[]
  metadata?: any
}

export interface AppThread {
  id: string
  title: string
  preview: string
  updatedAt: string
  messageCount: number
  type?: "individual" | "group"
  metadata?: {
    memberIds?: string[]
    kickedIds?: string[]
    characterId?: string
    character_id?: string
  }
}
