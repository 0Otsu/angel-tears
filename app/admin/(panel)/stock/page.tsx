import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { StockAdmin } from "@/components/admin/stock-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionInventario } from "@/lib/modulos/inventario/administracion-aplicacion"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { filtroStock } from "@/lib/presentacion/inventario"

export default async function PaginaStock({searchParams}: {searchParams: Promise<{estado?:string}>}) {
  await exigirAdministradoraEnPagina()
  let filas: FilaStock[] = []
  let errorCarga = false
  try {
    filas = (await obtenerAdministracionInventario().consultar(await headers())).filas
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[inventario] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  const inicial = filtroStock((await searchParams).estado)
  return <StockAdmin key={inicial} filas={filas} errorCarga={errorCarga} filtroInicial={inicial} />
}

export const metadata: Metadata = { title: "Inventario" }
