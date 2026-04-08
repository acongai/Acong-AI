"use client"

import { motion } from "framer-motion"

import { COPY } from "@/lib/copy"
import { cn } from "@/lib/utils"

interface PackageOption {
  code: "package_basic" | "package_pro"
  credits: number
  priceIdr: number
}

interface PackageSelectorProps {
  onSelect: (code: "package_basic" | "package_pro") => void
  packages: PackageOption[]
  selectedCode: "package_basic" | "package_pro"
}

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

export function PackageSelector({
  onSelect,
  packages,
  selectedCode,
}: PackageSelectorProps) {
  return (
    <div className="grid gap-3">
      {packages.map((item, index) => {
        const active = selectedCode === item.code

        return (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              active
                ? "border-[var(--foreground)] bg-[var(--card)]"
                : "border-[var(--border)] bg-[var(--secondary)] hover:border-[var(--foreground)]",
            )}
            initial={{ opacity: 0, y: 12 }}
            key={item.code}
            onClick={() => onSelect(item.code)}
            transition={{ delay: index * 0.04, duration: 0.2 }}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {item.code === "package_basic"
                    ? COPY.packageBasicName
                    : COPY.packageProName}
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {item.credits} kredit
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">
                {formatIdr(item.priceIdr)}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
