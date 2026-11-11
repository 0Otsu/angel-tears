import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ProductosAdmin } from "@/components/admin/productos-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { obtenerAdministracionProductos } from "@/lib/modulos/productos/administracion-aplicacion"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import type { ConsultaAdministrativa } from "@/lib/modulos/productos/administracion-contrato"
import { obtenerDb } from "@/lib/infraestructura/db"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { filtroStock } from "@/lib/presentacion/inventario"

export default async function PaginaProductos({ searchParams }: { searchParams: Promise<{ cancelado?: string; stock?: string }> }) {
  await exigirAdministradoraEnPagina()
  let consulta: ConsultaAdministrativa = { productos: [], categorias: [] }
  let errorCarga = false
  let disponibilidad: Record<string, boolean> = {}
  let existencias: Record<string, number> = {}
  try {
    consulta = await obtenerAdministracionProductos().consultar(await headers())
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[productos] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  // La lectura agrupada existente se ejecuta despues de la autorizacion; no crea otro saldo.
  if (!errorCarga && consulta.productos.length > 0) {
    try {
      const saldos = await crearContratoInventario(obtenerDb()).consultarDisponibilidad(consulta.productos.map(p => p.id))
      disponibilidad = Object.fromEntries(saldos.map(s => [s.productoId, s.hayStock]))
      existencias = Object.fromEntries(saldos.map(s => [s.productoId, s.saldo]))
    } catch (error) {
      console.error("[productos] disponibilidad no consultada", { tipo: error instanceof Error ? error.name : typeof error })
    }
  }
  const { cancelado, stock } = await searchParams
  const conservado = consulta.productos.find(p => p.id === cancelado)
  const inicial = filtroStock(stock)
  return <ProductosAdmin key={inicial} consulta={consulta} existencias={existencias} filtroStockInicial={inicial} disponibilidad={disponibilidad} errorCarga={errorCarga} aviso={conservado ? conservado.publicado ? "El producto conserva su último estado guardado." : "El producto quedó guardado como oculto." : undefined} />
}

export const metadata: Metadata = { title: "Productos" }
