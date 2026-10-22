import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaEgresos() {
  await exigirAdministradoraEnPagina()
  return <VistaModulo modulo="egresos" />
}

export const metadata: Metadata = { title: "Egresos" }
