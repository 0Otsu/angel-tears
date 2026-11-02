import { headers } from "next/headers"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { obtenerAdministracionProductos } from "@/lib/modulos/productos/administracion-aplicacion"
import { NuevoProducto } from "@/components/admin/editor-producto"
export const metadata = { title: "Nuevo producto" }
export default async function PaginaNuevoProducto() {
  await exigirAdministradoraEnPagina()
  const consulta = await obtenerAdministracionProductos().consultar(await headers())
  return <NuevoProducto categorias={consulta.categorias} />
}
