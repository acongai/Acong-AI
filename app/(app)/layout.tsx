import { Suspense } from "react"

import { AppShell } from "@/components/layout/AppShell"
import type { ReactNode } from "react"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2F2F2]" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}
