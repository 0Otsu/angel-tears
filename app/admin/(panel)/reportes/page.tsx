import type { Metadata } from "next"
import { ReportesAdmin } from "@/components/admin/reportes-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaReportes() {
  await exigirAdministradoraEnPagina()
  return <ReportesAdmin />
}

export const metadata: Metadata = { title: "Reportes" }
