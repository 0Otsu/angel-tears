import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaProductos() {
  await exigirAdministradoraEnPagina()
  return <VistaModulo modulo="productos" />
}

export const metadata: Metadata = { title: "Productos" }
