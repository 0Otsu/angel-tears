import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { EgresosAdmin } from "@/components/admin/egresos-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { obtenerAdministracionEgresos } from "@/lib/modulos/egresos/administracion-aplicacion"
import { mesActualEgresos } from "@/lib/modulos/egresos/validacion"
import type { ResultadoListado } from "@/lib/modulos/egresos/contrato"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaEgresos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const p = await searchParams
  const texto = (v: unknown) => typeof v === "string" ? v : ""
  const mes = mesActualEgresos()
  const filtros = { estado: texto(p.estado), desde: p.desde === undefined ? mes.desde : texto(p.desde), hasta: p.hasta === undefined ? mes.hasta : texto(p.hasta) }
  let listado: ResultadoListado = { estado: "ok", egresos: [], hayMas: false }, errorCarga = false
  try { listado = await obtenerAdministracionEgresos().listar(await headers(), filtros) }
  catch (e) {
    if (esErrorSesionRequerida(e)) redirect("/admin/login")
    console.error("[egresos] fallo de consulta", { tipo: e instanceof Error ? e.name : typeof e })
    errorCarga = true
  }
  return <EgresosAdmin egresos={listado.estado === "ok" ? listado.egresos : []} hayMas={listado.estado === "ok" && listado.hayMas}
    filtros={filtros} erroresFiltro={listado.estado === "datos_invalidos" ? listado.errores : {}} errorCarga={errorCarga} />
}

export const metadata: Metadata = { title: "Egresos manuales" }
