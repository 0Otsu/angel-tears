import { resolverFiltrosOperaciones } from "@/lib/presentacion/operaciones"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ComprasAdmin } from "@/components/admin/compras-admin"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import type { ProductoParaComprar, ProveedorParaComprar } from "@/lib/modulos/compras/administracion-contrato"
import { obtenerAdministracionCompras } from "@/lib/modulos/compras/administracion-aplicacion"
import type { ResultadoListadoCompras } from "@/lib/modulos/compras/contrato"

export default async function PaginaCompras({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const parametros = await searchParams
  const { filtros, errores } = resolverFiltrosOperaciones(parametros)
  let listado: ResultadoListadoCompras = { estado: "ok", compras: [], hayMas: false }
  let productos: ProductoParaComprar[] = []
  let proveedores: ProveedorParaComprar[] = []
  let errorCarga = false
  try {
    const encabezados = await headers()
    const administracion = obtenerAdministracionCompras()
    ;[listado, productos, proveedores] = await Promise.all([
      Object.keys(errores).length ? Promise.resolve({ estado: "datos_invalidos" as const, errores }) : administracion.listar(encabezados, { ...filtros, limite: 25 }),
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
    paginacion={listado.estado === "ok" ? listado.paginacion : undefined} filtros={filtros}
    erroresFiltro={listado.estado === "datos_invalidos" ? listado.errores : {}}
    errorCarga={errorCarga}
  />
}

export const metadata: Metadata = { title: "Compras" }
