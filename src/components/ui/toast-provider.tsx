'use client'

import { ToastProvider as Provider } from "@/components/ui/toast"

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>
} 