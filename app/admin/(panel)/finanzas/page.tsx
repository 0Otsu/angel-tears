import type { Metadata } from "next"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { redirect } from "next/navigation"
import type { FiltroFinanzas } from "@/lib/modulos/finanzas/contrato"

export default async function PaginaFinanzas({ searchParams }: { searchParams: Promise<FiltroFinanzas> }) {
  await exigirAdministradoraEnPagina()
  const filtro = await searchParams
  const parametros = new URLSearchParams()
  for (const campo of ["modo", "referencia", "mes", "anio", "desde", "hasta", "tipo", "estado"] as const) {
    const valor = filtro[campo]
    if (typeof valor === "string") parametros.set(campo, valor)
  }
  redirect(`/admin${parametros.size ? `?${parametros}` : ""}`)
}

export const metadata: Metadata = { title: "Resumen" }
