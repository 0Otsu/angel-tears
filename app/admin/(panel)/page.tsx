import type { Metadata } from "next"
import { ResumenAdmin } from "@/components/admin/resumen-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaResumen() {
  await exigirAdministradoraEnPagina()
  return <ResumenAdmin />
}

export const metadata: Metadata = { title: "Resumen" }
