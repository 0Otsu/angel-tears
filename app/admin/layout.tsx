import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s | Angel Tears" },
  robots: { index: false, follow: false },
}

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  // El grupo (panel) y sus páginas verifican la sesión. Login y recuperación son públicos.
  return children
}
