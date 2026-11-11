import { resolverFiltrosOperaciones } from "@/lib/presentacion/operaciones"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { EgresosAdmin } from "@/components/admin/egresos-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionEgresos } from "@/lib/modulos/egresos/administracion-aplicacion"
import type { ResultadoListado } from "@/lib/modulos/egresos/contrato"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaGastos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const p = await searchParams
  const { filtros, errores } = resolverFiltrosOperaciones(p)
  let listado: ResultadoListado = { estado: "ok", egresos: [], hayMas: false }, errorCarga = false
  try { listado = Object.keys(errores).length ? { estado: "datos_invalidos", errores } : await obtenerAdministracionEgresos().listar(await headers(), { ...filtros, limite: 25 }) }
  catch (e) {
    if (esErrorSesionRequerida(e)) redirect("/admin/login")
    console.error("[egresos] fallo de consulta", { tipo: e instanceof Error ? e.name : typeof e })
    errorCarga = true
  }
  return <EgresosAdmin egresos={listado.estado === "ok" ? listado.egresos : []} hayMas={listado.estado === "ok" && listado.hayMas}
    paginacion={listado.estado === "ok" ? listado.paginacion : undefined} filtros={filtros} erroresFiltro={listado.estado === "datos_invalidos" ? listado.errores : {}} errorCarga={errorCarga} />
}

export const metadata: Metadata = { title: "Gastos" }
