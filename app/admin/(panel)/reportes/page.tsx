import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaReportes() {
  await exigirAdministradoraEnPagina()
  redirect("/admin")
}

export const metadata: Metadata = { title: "Reportes" }
