import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s | Angel Tears" },
  robots: { index: false, follow: false },
}

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  // Solo metadata compartida. No hay verificación de acceso en este prototipo.
  return children
}
