import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaStock() {
  await exigirAdministradoraEnPagina()
  return <VistaModulo modulo="stock" />
}

export const metadata: Metadata = { title: "Stock" }
