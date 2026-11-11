"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerAdministracionCompras } from "@/lib/modulos/compras/administracion-aplicacion"
import type {
  ResultadoAnulacionAdmin,
  ResultadoDetalleAdmin,
  ResultadoRegistroAdmin,
} from "@/lib/modulos/compras/administracion-contrato"

// Server Actions de Compras. Cada una vuelve a exigir la Administradora en el servidor (via la
// administracion) y nunca devuelve detalles tecnicos al cliente.

// El saldo cambia despues del commit: se refrescan las superficies que dependen de el (Home,
// catalogo y PDP) y el Resumen/Inventario administrativos. Nunca dentro de la transaccion.
function refrescarSuperficies() {
  for (const ruta of ["/admin/compras", "/admin/stock", "/admin", "/", "/catalogo"]) revalidatePath(ruta)
  revalidatePath("/catalogo/[slug]", "page")
}

export async function registrarCompraAccion(entrada: unknown): Promise<ResultadoRegistroAdmin> {
  try {
    const resultado = await obtenerAdministracionCompras().registrar(await headers(), entrada)
    // Un reintento ya confirmado (repetido) no cambia ningun saldo.
    if (resultado.estado === "ok" && !resultado.repetido) refrescarSuperficies()
    return resultado
  } catch (error) {
    console.error("[compras] fallo al registrar", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function anularCompraAccion(compraId: unknown): Promise<ResultadoAnulacionAdmin> {
  try {
    const resultado = await obtenerAdministracionCompras().anular(await headers(), compraId)
    if (resultado.estado === "ok") refrescarSuperficies()
    return resultado
  } catch (error) {
    console.error("[compras] fallo al anular", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function consultarDetalleCompraAccion(compraId: unknown): Promise<ResultadoDetalleAdmin> {
  try {
    return await obtenerAdministracionCompras().detalle(await headers(), compraId)
  } catch (error) {
    console.error("[compras] fallo al consultar el detalle", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}
