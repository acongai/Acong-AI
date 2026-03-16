"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { useThread } from "@/hooks/useThread"
import { PaywallModal } from "@/components/payments/PaywallModal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { COPY } from "@/lib/copy"
import type { AppAttachment } from "@/types"

import { Composer } from "./Composer"
import { MessageList } from "./MessageList"

interface ChatShellProps {
  threadId?: string
}

export function ChatShell({ threadId }: ChatShellProps) {
  const [draft, setDraft] = useState("")
  const [uploadedAttachments, setUploadedAttachments] = useState<AppAttachment[]>(
    [],
  )
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const thread = useThread({
    includeMessages: true,
    threadId,
  })

  async function handleSubmit(value: string) {
    const result = await thread.sendMessage(
      value,
      uploadedAttachments.map((attachment) => attachment.id),
    )

    if (result !== "login_required") {
      setDraft("")
      setUploadedAttachments([])
      setUploadProgress(null)
    }
  }

  async function handleRegenerate() {
    await thread.regenerateLastReply()
  }

  function triggerFilePicker() {
    fileInputRef.current?.click()
  }

  async function uploadFile(file: File) {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      const formData = new FormData()

      formData.append("file", file)

      if (threadId) {
        formData.append("threadId", threadId)
      }

      request.open("POST", "/api/upload")
      request.responseType = "json"
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress((event.loaded / event.total) * 100)
        }
      }

      request.onload = () => {
        const payload = request.response as
          | {
              attachment?: {
                fileName?: string
                id: string
                mimeType?: string
                url: string
              }
              error?: string
            }
          | null
        const uploadedAttachment = payload?.attachment

        if (request.status >= 200 && request.status < 300 && uploadedAttachment) {
          setUploadedAttachments((current) => [
            ...current,
            {
              ...uploadedAttachment,
              fileType: "image",
            },
          ])
          setUploadProgress(null)
          resolve()
          return
        }

        const error = payload?.error ?? COPY.upload.genericError
        setUploadProgress(null)
        reject(new Error(error))
      }

      request.onerror = () => {
        setUploadProgress(null)
        reject(new Error(COPY.upload.networkError))
      }

      request.send(formData)
    })
  }

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      await uploadFile(file)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : COPY.upload.genericError,
      )
    } finally {
      event.target.value = ""
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-[#F2F2F2]">
      <input
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelection}
        ref={fileInputRef}
        type="file"
      />

      {(thread.isPreviewMode || thread.error) ? (
        <div className="px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-2">
            {thread.isPreviewMode ? (
              <p className="rounded border border-[#F0D080] bg-[#FFF8E1] px-3 py-2 text-xs text-[#7A5C00]">
                {COPY.preview.notice}
              </p>
            ) : null}
            {thread.error ? (
              <p className="rounded border border-[#E5484D]/20 bg-[#E5484D]/10 px-3 py-2 text-xs text-[#E5484D]">
                {thread.error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <MessageList
        emptySubtitle={COPY.emptyStateSubtitle}
        emptyTitle={COPY.emptyStateTitle}
        isGenerating={thread.isSending}
        messages={thread.messages}
      />

      <Composer
        attachments={uploadedAttachments}
        canUpload={!thread.isPreviewMode}
        disabled={thread.isLoading}
        isSubmitting={thread.isSending}
        onPickAttachment={triggerFilePicker}
        onRegenerate={handleRegenerate}
        onSubmit={handleSubmit}
        onValueChange={setDraft}
        regenerateDisabled={
          thread.messages.length === 0 || (!thread.isPreviewMode && !threadId)
        }
        uploadProgress={uploadProgress}
        value={draft}
      />

      <Dialog onOpenChange={thread.closeLoginPrompt} open={thread.loginPromptOpen}>
        <DialogContent className="border-[#E4E4E4] bg-white text-[#111111] sm:max-w-md">
          <DialogTitle className="text-xl font-semibold text-[#111111]">
            {COPY.dialogs.loginTitle}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#666666]">
            {COPY.dialogs.loginSubtitle}
          </DialogDescription>
          <div className="mt-4 flex justify-end">
            <Link
              className="inline-flex h-10 items-center justify-center rounded bg-[#111111] px-5 text-sm font-medium text-white transition-colors hover:bg-[#222222]"
              href="/login"
            >
              {COPY.dialogs.loginButton}
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <PaywallModal
        onOpenChange={(open) => {
          if (!open) {
            thread.closePaymentPrompt()
          }
        }}
        open={Boolean(thread.paymentPrompt)}
        threadId={thread.paymentPrompt?.threadId ?? threadId}
      />
    </section>
  )
}
