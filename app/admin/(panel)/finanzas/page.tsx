import type { Metadata } from "next"
import { ReportesAdmin } from "@/components/admin/reportes-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaFinanzas() {
  await exigirAdministradoraEnPagina()
  return <ReportesAdmin />
}

export const metadata: Metadata = { title: "Finanzas" }
