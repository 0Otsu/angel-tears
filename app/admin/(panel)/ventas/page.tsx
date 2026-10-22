import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaVentas() {
  await exigirAdministradoraEnPagina()
  return <VistaModulo modulo="ventas" />
}

export const metadata: Metadata = { title: "Ventas" }
