import { resolverFiltrosOperaciones } from "@/lib/presentacion/operaciones"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { VentasAdmin } from "@/components/admin/ventas-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import { obtenerAdministracionVentas } from "@/lib/modulos/ventas/administracion-aplicacion"
import type { ResultadoListadoVentas } from "@/lib/modulos/ventas/contrato"

export default async function PaginaVentas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const parametros = await searchParams
  const { filtros, errores } = resolverFiltrosOperaciones(parametros)
  let listado: ResultadoListadoVentas = { estado: "ok", ventas: [], hayMas: false }
  let productos: ProductoParaVender[] = []
  let errorCarga = false
  try {
    const encabezados = await headers()
    const administracion = obtenerAdministracionVentas()
    ;[listado, productos] = await Promise.all([Object.keys(errores).length ? Promise.resolve({ estado: "datos_invalidos" as const, errores }) : administracion.listar(encabezados, { ...filtros, limite: 25 }), administracion.productosParaVender(encabezados)])
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[ventas] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  return <VentasAdmin
    ventas={listado.estado === "ok" ? [...listado.ventas] : []}
    hayMas={listado.estado === "ok" && listado.hayMas}
    productos={productos}
    paginacion={listado.estado === "ok" ? listado.paginacion : undefined} filtros={filtros}
    erroresFiltro={listado.estado === "datos_invalidos" ? listado.errores : {}}
    errorCarga={errorCarga}
  />
}

export const metadata: Metadata = { title: "Ventas" }
