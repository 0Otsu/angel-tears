import type { ReactNode } from "react"
import { EstructuraAdmin } from "@/components/admin/estructura-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

// Exige sesion antes de entregar el panel y pasa al shell la identidad real (nombre y email).
// Este layout no se vuelve a ejecutar al navegar entre paginas del panel: cada page.tsx
// verifica la sesion por su cuenta (ver guardia-admin.ts).
export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const administradora = await exigirAdministradoraEnPagina()
  return (
    <EstructuraAdmin nombre={administradora.nombre} email={administradora.email}>
      {children}
    </EstructuraAdmin>
  )
}
