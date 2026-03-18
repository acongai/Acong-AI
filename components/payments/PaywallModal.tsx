"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { CREDIT_PACKAGES, type CreditPackageCode } from "@/lib/billing/wallet"
import { COPY } from "@/lib/copy"

import { PackageSelector } from "./PackageSelector"

interface PaywallModalProps {
  onOpenChange: (open: boolean) => void
  open: boolean
  threadId?: string | null
}

const PACKAGE_OPTIONS = [
  {
    code: CREDIT_PACKAGES.package_basic.code,
    credits: CREDIT_PACKAGES.package_basic.credits,
    priceIdr: CREDIT_PACKAGES.package_basic.priceIdr,
  },
  {
    code: CREDIT_PACKAGES.package_pro.code,
    credits: CREDIT_PACKAGES.package_pro.credits,
    priceIdr: CREDIT_PACKAGES.package_pro.priceIdr,
  },
] satisfies Array<{
  code: CreditPackageCode
  credits: number
  priceIdr: number
}>

export function PaywallModal({
  onOpenChange,
  open,
  threadId,
}: PaywallModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [selectedPackage, setSelectedPackage] =
    useState<CreditPackageCode>("package_basic")

  async function handleCheckout() {
    setIsLoading(true)

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageCode: selectedPackage,
          threadId,
        }),
      })

      const payload = (await response.json()) as {
        checkoutUrl?: string
        error?: string
      }

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? COPY.api.paymentCreateFailed)
      }

      window.location.href = payload.checkoutUrl
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : COPY.api.paymentCreateFailed,
      )
      setIsLoading(false)
    }
  }

  async function handleVerify() {
    setIsVerifying(true)

    try {
      const response = await fetch("/api/payments/verify", { method: "POST" })
      const payload = (await response.json()) as { status?: string; error?: string }

      if (!response.ok) {
        toast.error(COPY.payments.verifyError)
        return
      }

      if (payload.status === "credited") {
        toast.success(COPY.payments.verifySuccess)
        window.dispatchEvent(new CustomEvent("acong:credits:topup"))
        onOpenChange(false)
      } else if (payload.status === "already_credited") {
        toast.success(COPY.payments.verifyAlreadyCredited)
        window.dispatchEvent(new CustomEvent("acong:credits:topup"))
        onOpenChange(false)
      } else if (payload.status === "not_paid") {
        toast.error(COPY.payments.verifyNotPaid)
      } else {
        toast.error(COPY.payments.verifyNoPending)
      }
    } catch {
      toast.error(COPY.payments.verifyError)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="border-[#E4E4E4] bg-white text-[#111111] sm:max-w-xl">
        <DialogTitle className="text-xl font-semibold text-[#111111]">
          {COPY.paywallTitle}
        </DialogTitle>
        <DialogDescription className="text-sm leading-6 text-[#666666]">
          {COPY.paywallSubtitle}
        </DialogDescription>
        <p className="text-xs text-[#666666]">
          Pesan kamu sudah disimpan. Akan terkirim setelah kredit terisi.
        </p>

        <div className="mt-2">
          <PackageSelector
            onSelect={setSelectedPackage}
            packages={PACKAGE_OPTIONS}
            selectedCode={selectedPackage}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            className="h-9 rounded px-4 text-sm text-[#666666] hover:bg-[#F8F8F8] hover:text-[#111111]"
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Nanti aja
          </Button>
          <Button
            className="h-9 rounded bg-[#111111] px-4 text-sm text-white hover:bg-[#222222]"
            disabled={isLoading}
            onClick={() => {
              void handleCheckout()
            }}
            type="button"
          >
            {isLoading ? COPY.payments.checkoutLoading : COPY.paywallCTA}
          </Button>
        </div>

        <div className="mt-2 flex justify-center">
          <button
            className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline disabled:opacity-50"
            disabled={isVerifying}
            onClick={() => void handleVerify()}
            type="button"
          >
            {isVerifying ? COPY.payments.verifyLoading : COPY.payments.verifyButton}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
