import type { ReactNode } from "react"
import { EstructuraAdmin } from "@/components/admin/estructura-admin"

export default function LayoutPanel({ children }: { children: ReactNode }) {
  return <EstructuraAdmin>{children}</EstructuraAdmin>
}
