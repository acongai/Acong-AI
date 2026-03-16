import { createAdminClient } from "@/lib/db/client"
import { COPY } from "@/lib/copy"
import type { MessageAttachmentRow } from "@/lib/db/types"

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024

export function assertValidImageUpload({
  mimeType,
  size,
}: {
  mimeType: string
  size: number
}) {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error(COPY.upload.invalidType)
  }

  if (size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(COPY.upload.invalidSize)
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-")
}

export async function uploadImageAttachment({
  fileBuffer,
  fileName,
  mimeType,
  size,
  threadId,
  userId,
}: {
  fileBuffer: Buffer
  fileName: string
  mimeType: string
  size: number
  threadId?: string | null
  userId: string
}) {
  assertValidImageUpload({
    mimeType,
    size,
  })

  const admin = createAdminClient()
  const extension = fileName.split(".").pop() || "bin"
  const storagePath = `${userId}/${crypto.randomUUID()}-${sanitizeFileName(fileName || `upload.${extension}`)}`

  const { error: uploadError } = await admin.storage
    .from("attachments")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("attachments").getPublicUrl(storagePath)

  const { data, error } = await admin
    .from("message_attachments")
    .insert({
      file_name: fileName,
      file_size: size,
      file_type: "image",
      metadata: null,
      mime_type: mimeType,
      public_url: publicUrl,
      storage_path: storagePath,
      thread_id: threadId ?? null,
      user_id: userId,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as MessageAttachmentRow
}

export async function attachUploadsToMessage({
  attachmentIds,
  messageId,
  threadId,
  userId,
}: {
  attachmentIds: string[]
  messageId: string
  threadId: string
  userId: string
}) {
  if (!attachmentIds.length) {
    return [] as MessageAttachmentRow[]
  }

  const admin = createAdminClient()
  const { data: attachments, error: fetchError } = await admin
    .from("message_attachments")
    .select("*")
    .in("id", attachmentIds)
    .eq("user_id", userId)

  if (fetchError) {
    throw fetchError
  }

  const rows = (attachments ?? []) as MessageAttachmentRow[]

  if (rows.length !== attachmentIds.length) {
    throw new Error(COPY.api.sendInvalid)
  }

  const { data, error } = await admin
    .from("message_attachments")
    .update({
      message_id: messageId,
      thread_id: threadId,
    })
    .in("id", attachmentIds)
    .eq("user_id", userId)
    .select("*")

  if (error) {
    throw error
  }

  return (data ?? []) as MessageAttachmentRow[]
}
