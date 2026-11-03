import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { StockAdmin } from "@/components/admin/stock-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionInventario } from "@/lib/modulos/inventario/administracion-aplicacion"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"

export default async function PaginaStock() {
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
  return <StockAdmin filas={filas} errorCarga={errorCarga} />
}

export const metadata: Metadata = { title: "Inventario" }
