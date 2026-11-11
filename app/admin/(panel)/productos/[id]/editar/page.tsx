import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { z } from "zod"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { obtenerAdministracionProductos } from "@/lib/modulos/productos/administracion-aplicacion"
import { EditorProducto } from "@/components/admin/editor-producto"
import { obtenerDb } from "@/lib/infraestructura/db"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { estadoVisualStock } from "@/lib/presentacion/inventario"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
export const metadata = { title: "Editar producto" }
export default async function PaginaEditarProducto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paso?: string; alta?: string }> }) {
  await exigirAdministradoraEnPagina()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const consulta = await obtenerAdministracionProductos().consultar(await headers(), id)
  const producto = consulta.productos[0]
  if (!producto) notFound()
  let existencias: FilaStock | null = null
  try {
    const [saldo] = await crearContratoInventario(obtenerDb()).consultarDisponibilidad([id])
    if (saldo) existencias = { productoId: id, nombre: producto.nombre, categoriaNombre: producto.categoriaNombre, publicado: producto.publicado, saldo: saldo.saldo, minimo: saldo.minimo, stockBajo: estadoVisualStock(saldo.saldo) !== "disponible", sinStock: !saldo.hayStock }
  } catch (error) {
    console.error("[productos] existencias no consultadas", { tipo: error instanceof Error ? error.name : typeof error })
  }
  const buscar = await searchParams
  return <EditorProducto key={id} producto={producto} existencias={existencias} categorias={consulta.categorias} pasoInicial={buscar.paso === "vista-previa" ? "vista-previa" : buscar.paso === "imagen" ? "imagen" : "datos"} alta={buscar.alta === "1"} />
}
