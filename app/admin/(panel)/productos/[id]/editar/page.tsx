import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { z } from "zod"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { obtenerAdministracionProductos } from "@/lib/modulos/productos/administracion-aplicacion"
import { EditorProducto } from "@/components/admin/editor-producto"
export const metadata = { title: "Editar producto" }
export default async function PaginaEditarProducto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paso?: string; alta?: string }> }) {
  await exigirAdministradoraEnPagina()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const consulta = await obtenerAdministracionProductos().consultar(await headers(), id)
  const producto = consulta.productos[0]
  if (!producto) notFound()
  const buscar = await searchParams
  return <EditorProducto key={id} producto={producto} categorias={consulta.categorias} pasoInicial={buscar.paso === "imagen" ? "imagen" : "datos"} alta={buscar.alta === "1"} />
}
