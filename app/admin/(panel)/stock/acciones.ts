"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerAdministracionInventario } from "@/lib/modulos/inventario/administracion-aplicacion"
import type {
  ResultadoAjusteAdmin,
  ResultadoHistorialAdmin,
  ResultadoMinimoAdmin,
} from "@/lib/modulos/inventario/administracion-contrato"

// Server Actions de Inventario. Cada una vuelve a exigir la Administradora en el servidor (via
// la administracion) y nunca devuelve detalles tecnicos al cliente.

// El saldo publico (hayStock) depende de este inventario: se refrescan Home, catalogo y PDP.
function refrescarSuperficies() {
  for (const ruta of ["/admin/stock", "/admin/productos", "/admin", "/", "/catalogo"]) revalidatePath(ruta)
  revalidatePath("/admin/productos/[id]/editar", "page")
  revalidatePath("/catalogo/[slug]", "page")
}

export async function ajustarStockAccion(entrada: unknown): Promise<ResultadoAjusteAdmin> {
  try {
    const resultado = await obtenerAdministracionInventario().ajustar(await headers(), entrada)
    if (resultado.estado === "ok") refrescarSuperficies()
    return resultado
  } catch (error) {
    console.error("[inventario] fallo al ajustar", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function cambiarMinimoAccion(entrada: { productoId: unknown; minimo: unknown }): Promise<ResultadoMinimoAdmin> {
  try {
    const resultado = await obtenerAdministracionInventario().cambiarMinimo(await headers(), entrada)
    if (resultado.estado === "ok") revalidatePath("/admin/stock")
    return resultado
  } catch (error) {
    console.error("[inventario] fallo al cambiar el minimo", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function consultarHistorialAccion(productoId: unknown): Promise<ResultadoHistorialAdmin> {
  try {
    return await obtenerAdministracionInventario().historial(await headers(), productoId)
  } catch (error) {
    console.error("[inventario] fallo al consultar el historial", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}
