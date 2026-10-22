import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaCompras() {
  await exigirAdministradoraEnPagina()
  return <VistaModulo modulo="compras" />
}

export const metadata: Metadata = { title: "Compras" }
