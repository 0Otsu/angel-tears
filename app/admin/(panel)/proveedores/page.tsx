import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaProveedores() {
  await exigirAdministradoraEnPagina()
  return <VistaModulo modulo="proveedores" />
}

export const metadata: Metadata = { title: "Proveedores" }
