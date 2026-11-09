"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerAdministracionVentas } from "@/lib/modulos/ventas/administracion-aplicacion"
import type {
  ResultadoAnulacionAdmin,
  ResultadoDetalleAdmin,
  ResultadoRegistroAdmin,
} from "@/lib/modulos/ventas/administracion-contrato"

// Server Actions de Ventas. Cada una vuelve a exigir la Administradora en el servidor (via la
// administracion) y nunca devuelve detalles tecnicos al cliente.

// El saldo cambia despues del commit: se refrescan las superficies que dependen de el (Home,
// catalogo y PDP) y el Resumen/Inventario administrativos. Nunca dentro de la transaccion.
function refrescarSuperficies() {
  for (const ruta of ["/admin/ventas", "/admin/stock", "/admin", "/", "/catalogo"]) revalidatePath(ruta)
  revalidatePath("/catalogo/[slug]", "page")
}

export async function registrarVentaAccion(entrada: unknown): Promise<ResultadoRegistroAdmin> {
  try {
    const resultado = await obtenerAdministracionVentas().registrar(await headers(), entrada)
    // Un reintento ya confirmado (repetido) no cambia ningun saldo.
    if (resultado.estado === "ok" && !resultado.repetido) refrescarSuperficies()
    return resultado
  } catch (error) {
    console.error("[ventas] fallo al registrar", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function anularVentaAccion(ventaId: unknown): Promise<ResultadoAnulacionAdmin> {
  try {
    const resultado = await obtenerAdministracionVentas().anular(await headers(), ventaId)
    if (resultado.estado === "ok") refrescarSuperficies()
    return resultado
  } catch (error) {
    console.error("[ventas] fallo al anular", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function consultarDetalleVentaAccion(ventaId: unknown): Promise<ResultadoDetalleAdmin> {
  try {
    return await obtenerAdministracionVentas().detalle(await headers(), ventaId)
  } catch (error) {
    console.error("[ventas] fallo al consultar el detalle", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}
