import type { Metadata } from "next"
import { ResumenAdmin } from "@/components/admin/resumen-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionInventario } from "@/lib/modulos/inventario/administracion-aplicacion"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { obtenerConsultaFinanzas } from "@/lib/modulos/finanzas/aplicacion"
import type { FiltroFinanzas, ResultadoFinanzas } from "@/lib/modulos/finanzas/contrato"

export default async function PaginaResumen({ searchParams }: { searchParams: Promise<FiltroFinanzas> }) {
  await exigirAdministradoraEnPagina()
  const filtro = await searchParams
  const encabezados = await headers()
  let filas: FilaStock[] = [], errorCarga = false
  try { filas = (await obtenerAdministracionInventario().consultar(encabezados)).filas }
  catch(error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[resumen] fallo al consultar inventario",{tipo:error instanceof Error ? error.name : typeof error})
    errorCarga = true
  }
  let finanzas: ResultadoFinanzas
  try { finanzas = await obtenerConsultaFinanzas().consultar(encabezados, filtro, true) }
  catch(error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    throw error
  }
  return <ResumenAdmin filas={filas} errorCarga={errorCarga} finanzas={finanzas} filtro={filtro} />
}

export const metadata: Metadata = { title: "Resumen" }
