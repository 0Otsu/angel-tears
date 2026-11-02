import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ProductosAdmin } from "@/components/admin/productos-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { obtenerAdministracionProductos } from "@/lib/modulos/productos/administracion-aplicacion"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import type { ConsultaAdministrativa } from "@/lib/modulos/productos/administracion-contrato"

export default async function PaginaProductos({ searchParams }: { searchParams: Promise<{ cancelado?: string }> }) {
  await exigirAdministradoraEnPagina()
  let consulta: ConsultaAdministrativa = { productos: [], categorias: [] }
  let errorCarga = false
  try {
    consulta = await obtenerAdministracionProductos().consultar(await headers())
  } catch (error) {
    if (esErrorSesionRequerida(error)) redirect("/admin/login")
    console.error("[productos] fallo de consulta", { tipo: error instanceof Error ? error.name : typeof error })
    errorCarga = true
  }
  const { cancelado } = await searchParams
  const conservado = consulta.productos.find(p => p.id === cancelado)
  return <ProductosAdmin consulta={consulta} errorCarga={errorCarga} aviso={conservado ? conservado.publicado ? "El producto conserva su último estado guardado." : "El producto quedó guardado como oculto." : undefined} />
}

export const metadata: Metadata = { title: "Productos" }
