import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ComprasAdmin } from "@/components/admin/compras-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import type { ProductoParaComprar, ProveedorParaComprar } from "@/lib/modulos/compras/administracion-contrato"
import { obtenerAdministracionCompras } from "@/lib/modulos/compras/administracion-aplicacion"
import type { ResultadoListadoCompras } from "@/lib/modulos/compras/contrato"

// Un parametro repetido o ausente se trata como vacio; los valores invalidos los rechaza la consulta.
const texto = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : "")

export default async function PaginaCompras({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const parametros = await searchParams
  const filtros = { estado: texto(parametros.estado), desde: texto(parametros.desde), hasta: texto(parametros.hasta) }
  let listado: ResultadoListadoCompras = { estado: "ok", compras: [], hayMas: false }
  let productos: ProductoParaComprar[] = []
  let proveedores: ProveedorParaComprar[] = []
  let errorCarga = false
  try {
    const encabezados = await headers()
    const administracion = obtenerAdministracionCompras()
    ;[listado, productos, proveedores] = await Promise.all([
      administracion.listar(encabezados, filtros),
      administracion.productosParaComprar(encabezados),
      administracion.proveedoresParaComprar(encabezados),
    ])
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[compras] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  return <ComprasAdmin
    compras={listado.estado === "ok" ? [...listado.compras] : []}
    hayMas={listado.estado === "ok" && listado.hayMas}
    productos={productos}
    proveedores={proveedores}
    filtros={filtros}
    erroresFiltro={listado.estado === "datos_invalidos" ? listado.errores : {}}
    errorCarga={errorCarga}
  />
}

export const metadata: Metadata = { title: "Compras" }
