"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { COPY } from "@/lib/copy"
import { createClient } from "@/supabase/client"

interface ConsentModalProps {
  onConsented: () => void
  onDeclined: () => void
  open: boolean
  userId: string
}

export function ConsentModal({
  onConsented,
  onDeclined,
  open,
  userId,
}: ConsentModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleConsent() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from("profiles")
      .update({ has_consented: true })
      .eq("id", userId)
    setLoading(false)
    onConsented()
  }

  async function handleDecline() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setLoading(false)
    onDeclined()
  }

  return (
    <Dialog onOpenChange={() => {}} open={open}>
      <DialogContent className="gap-6 overflow-hidden rounded-2xl border-[#E4E4E4] p-8 text-[#111111] sm:max-w-sm">
        <div className="space-y-2 text-center">
          <DialogTitle className="text-xl font-semibold text-[#111111]">
            {COPY.consent.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#666666]">
            {COPY.consent.body}
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="h-10 w-full bg-[#111111] text-sm text-white hover:bg-[#222222]"
            disabled={loading}
            onClick={handleConsent}
            type="button"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {COPY.consent.confirm}
          </Button>

          <Button
            className="h-10 w-full border border-[#E4E4E4] bg-white text-sm text-[#111111] hover:bg-[#F2F2F2]"
            disabled={loading}
            onClick={handleDecline}
            type="button"
            variant="outline"
          >
            {COPY.consent.decline}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
