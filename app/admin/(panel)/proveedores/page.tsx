import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ProveedoresAdmin } from "@/components/admin/proveedores-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionProveedores } from "@/lib/modulos/proveedores/administracion-aplicacion"
import type { ProveedorAdministrativo } from "@/lib/modulos/proveedores/administracion-contrato"

export default async function PaginaProveedores() {
  await exigirAdministradoraEnPagina()
  let proveedores: ProveedorAdministrativo[] = []
  let errorCarga = false
  try {
    proveedores = await obtenerAdministracionProveedores().consultar(await headers())
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[proveedores] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  return <ProveedoresAdmin proveedores={proveedores} errorCarga={errorCarga} />
}

export const metadata: Metadata = { title: "Proveedores" }
