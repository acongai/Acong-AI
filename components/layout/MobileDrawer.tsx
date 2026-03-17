"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"

import { COPY } from "@/lib/copy"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function MobileDrawer({
  open,
  onOpenChange,
  children,
}: MobileDrawerProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="w-[88vw] max-w-[320px] border-[#E4E4E4] bg-white p-0 text-[#111111]"
        side="left"
      >
        <SheetTitle className="sr-only">{COPY.sidebar.title}</SheetTitle>
        <div className="flex items-center justify-end border-b border-[#E4E4E4] px-4 py-2">
          <Button
            className="h-8 w-8 min-h-[44px] min-w-[44px] rounded bg-transparent text-[#666666] hover:bg-[#F8F8F8] hover:text-[#111111]"
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  )
}
