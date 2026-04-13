"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { motion } from "framer-motion"

import { useThread } from "@/hooks/useThread"
import { PaywallModal } from "@/components/payments/PaywallModal"
import { useLanguage } from "@/hooks/useLanguage"

import { Composer } from "./Composer"
import { EmptyStateMascot } from "./EmptyStateMascot"
import { MessageList } from "./MessageList"
import { GroupMemberPicker } from "./GroupMemberPicker"
import { GroupHeader } from "./GroupHeader"
import { AnimatePresence } from "framer-motion"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatShellProps {
  threadId?: string
}

export function ChatShell({ threadId }: ChatShellProps) {
  const { copy } = useLanguage()
  const [draft, setDraft] = useState("")
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const thread = useThread({
    includeMessages: true,
    threadId,
  })
  const closeLoginPrompt = thread.closeLoginPrompt
  const closePaymentPrompt = thread.closePaymentPrompt
  const error = thread.error
  const isLoading = thread.isLoading
  const isSending = thread.isSending
  const loginPromptOpen = thread.loginPromptOpen
  const messages = thread.messages
  const paymentPrompt = thread.paymentPrompt
  const refresh = thread.refresh
  const regenerateLastReply = thread.regenerateLastReply
  const sendMessage = thread.sendMessage
  const startGroupChat = thread.startGroupChat
  const failureMessage = copy.errorMessage

  const hasMessages = messages.length > 0 || isLoading
  const handleLoginClosed = useEffectEvent(() => {
    void refresh()
    setDraft("")
  })

  // When the hook signals login is required (401), open AppShell's modal
  useEffect(() => {
    if (loginPromptOpen) {
      window.dispatchEvent(new CustomEvent("acong:login:open"))
      closeLoginPrompt()
    }
  }, [closeLoginPrompt, loginPromptOpen])

  // When AppShell's modal closes without login, clean up pending state
  useEffect(() => {
    const handler = () => handleLoginClosed()
    window.addEventListener("acong:login:closed", handler)
    return () => window.removeEventListener("acong:login:closed", handler)
  }, [])

  async function handleSubmit(value: string) {
    setDraft("")
    const result = await sendMessage(value)

    if (result === "login_required") {
      setDraft(value)
    }

    if (result === "sent") {
      window.dispatchEvent(new CustomEvent("acong:credit:deducted"))
    }
  }

  async function handleRegenerate() {
    await regenerateLastReply()
  }

  return (
    <>
      <div
        className="h-full bg-[var(--background)]"
        style={{ backgroundImage: "radial-gradient(circle, var(--dot-color) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      >
      {hasMessages ? (
        <section className="flex h-full flex-col">
          {error ? (
            <div className="px-4 pt-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-4xl">
                <p className="rounded border border-[#E5484D]/20 bg-[#E5484D]/10 px-3 py-2 text-xs text-[#E5484D]">
                  {error}
                </p>
              </div>
            </div>
          ) : null}

          {thread.type === "group" && threadId && (
            <GroupHeader
              threadId={threadId}
              title={thread.threadTitle || ""}
              memberIds={thread.metadata?.memberIds || []}
              kickedIds={thread.metadata?.kickedIds || []}
              refresh={refresh}
            />
          )}

          <MessageList
            emptySubtitle={copy.emptyStateSubtitle}
            emptyTitle={copy.emptyStateTitle}
            isGenerating={isSending}
            messages={messages}
          />

          <Composer
            disabled={isLoading}
            isSubmitting={isSending}
            onRegenerate={handleRegenerate}
            onSubmit={handleSubmit}
            onValueChange={setDraft}
            regenerateDisabled={messages.length === 0 || !threadId}
            kickedIds={thread.metadata?.kickedIds || []}
            memberIds={thread.metadata?.memberIds || []}
            value={draft}
          />
        </section>
      ) : (
        <section
          className="flex h-full flex-col items-center justify-center px-4"
        >
          {error ? (
            <div className="mb-6 w-full max-w-2xl">
              <p className="rounded border border-[#E5484D]/20 bg-[#E5484D]/10 px-3 py-2 text-xs text-[#E5484D]">
                {error}
              </p>
            </div>
          ) : null}

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
          >
            <EmptyStateMascot thread={thread} threadId={threadId} />
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-2xl flex-col items-center gap-6"
            initial={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.12, duration: 0.25 }}
          >
            <Composer
              disabled={isLoading}
              isSubmitting={isSending}
              onRegenerate={handleRegenerate}
              onSubmit={handleSubmit}
              onValueChange={setDraft}
              regenerateDisabled={true}
              kickedIds={thread.metadata?.kickedIds || []}
              memberIds={thread.metadata?.memberIds || []}
              value={draft}
              variant="centered"
            />

            <Button
              variant="outline"
              onClick={() => setIsPickerOpen(true)}
              className="h-10 rounded-full border-[var(--border)] bg-[var(--card)] px-6 text-sm text-[var(--foreground)] hover:bg-[var(--secondary)]"
            >
              <Users className="mr-2 h-4 w-4" />
              👥 Group Chat
            </Button>
          </motion.div>
        </section>
      )}
      </div>

      <AnimatePresence>
        {isPickerOpen && (
          <GroupMemberPicker 
            onClose={() => setIsPickerOpen(false)}
            onConfirm={(ids) => {
              setIsPickerOpen(false)
              void startGroupChat(ids)
            }}
          />
        )}
      </AnimatePresence>

      <PaywallModal
        onOpenChange={(open) => {
          if (!open) {
            closePaymentPrompt()
          }
        }}
        open={Boolean(paymentPrompt)}
        threadId={paymentPrompt?.threadId ?? threadId}
      />
    </>
  )
}
