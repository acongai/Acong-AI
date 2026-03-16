"use client"

import { useEffect, useRef } from "react"
import { ImagePlus, RotateCcw, SendHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { COPY } from "@/lib/copy"
import type { AppAttachment } from "@/types"

interface ComposerProps {
  attachments?: AppAttachment[]
  canUpload?: boolean
  disabled?: boolean
  isSubmitting?: boolean
  onPickAttachment?: () => void
  onRegenerate?: () => void
  onSubmit: (value: string) => void | Promise<void>
  onValueChange: (value: string) => void
  regenerateDisabled?: boolean
  uploadProgress?: number | null
  value: string
}

export function Composer({
  attachments = [],
  canUpload = false,
  disabled = false,
  isSubmitting = false,
  onPickAttachment,
  onRegenerate,
  onSubmit,
  onValueChange,
  regenerateDisabled = false,
  uploadProgress,
  value,
}: ComposerProps) {
  const canSend = value.trim().length > 0 && !disabled && !isSubmitting
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <div className="sticky bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-[#E4E4E4] bg-white shadow-sm">
          <Textarea
            className="min-h-[44px] resize-none border-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-[#111111] placeholder:text-[#999999] focus-visible:ring-0"
            disabled={disabled || isSubmitting}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void onSubmit(value)
              }
            }}
            placeholder={COPY.composer.placeholder}
            ref={textareaRef}
            rows={1}
            value={value}
          />

          {attachments.length ? (
            <div className="grid gap-3 px-4 pb-3 sm:grid-cols-2">
              {attachments.map((attachment) => (
                <div
                  className="overflow-hidden rounded-md border border-[#E4E4E4]"
                  key={attachment.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={attachment.fileName ?? COPY.composer.uploadAlt}
                    className="h-32 w-full object-cover"
                    src={attachment.url}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {typeof uploadProgress === "number" ? (
            <div className="px-4 pb-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[#666666]">
                <span>{COPY.composer.uploadSection}</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress className="h-1.5 bg-[#F2F2F2]" value={uploadProgress} />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-[#EEEEEE] px-3 py-2">
            <div className="flex items-center gap-1">
              <Button
                className="h-8 w-8 rounded text-[#666666] hover:bg-[#F8F8F8] hover:text-[#111111]"
                disabled={!canUpload || disabled}
                onClick={onPickAttachment}
                size="icon"
                title={COPY.composer.uploadLabel}
                type="button"
                variant="ghost"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>

              <Button
                className="h-8 rounded px-3 text-xs text-[#666666] hover:bg-[#F8F8F8] hover:text-[#111111]"
                disabled={regenerateDisabled}
                onClick={onRegenerate}
                type="button"
                variant="ghost"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {COPY.regenerateLabel}
              </Button>
            </div>

            <Button
              className="h-8 w-8 rounded bg-[#111111] text-white hover:bg-[#222222]"
              disabled={!canSend}
              onClick={() => {
                void onSubmit(value)
              }}
              size="icon"
              title={COPY.composer.sendLabel}
              type="button"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
