import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { VentasAdmin } from "@/components/admin/ventas-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import { obtenerAdministracionVentas } from "@/lib/modulos/ventas/administracion-aplicacion"
import type { ResultadoListadoVentas } from "@/lib/modulos/ventas/contrato"

// Un parametro repetido o ausente se trata como vacio; los valores invalidos los rechaza la consulta.
const texto = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : "")

export default async function PaginaVentas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const parametros = await searchParams
  const filtros = { estado: texto(parametros.estado), desde: texto(parametros.desde), hasta: texto(parametros.hasta) }
  let listado: ResultadoListadoVentas = { estado: "ok", ventas: [], hayMas: false }
  let productos: ProductoParaVender[] = []
  let errorCarga = false
  try {
    const encabezados = await headers()
    const administracion = obtenerAdministracionVentas()
    ;[listado, productos] = await Promise.all([administracion.listar(encabezados, filtros), administracion.productosParaVender(encabezados)])
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[ventas] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  return <VentasAdmin
    ventas={listado.estado === "ok" ? [...listado.ventas] : []}
    hayMas={listado.estado === "ok" && listado.hayMas}
    productos={productos}
    filtros={filtros}
    erroresFiltro={listado.estado === "datos_invalidos" ? listado.errores : {}}
    errorCarga={errorCarga}
  />
}

export const metadata: Metadata = { title: "Ventas" }
