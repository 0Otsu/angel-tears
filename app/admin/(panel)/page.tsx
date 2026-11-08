import type { Metadata } from "next"
import { ResumenAdmin } from "@/components/admin/resumen-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionInventario } from "@/lib/modulos/inventario/administracion-aplicacion"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"

export default async function PaginaResumen() {
  await exigirAdministradoraEnPagina()
  let filas: FilaStock[] = [], errorCarga = false
  try { filas = (await obtenerAdministracionInventario().consultar(await headers())).filas }
  catch(error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[resumen] fallo al consultar inventario",{tipo:error instanceof Error ? error.name : typeof error})
    errorCarga = true
  }
  return <ResumenAdmin filas={filas} errorCarga={errorCarga} />
}

export const metadata: Metadata = { title: "Resumen" }
