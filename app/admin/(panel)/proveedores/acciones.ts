"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerAdministracionProveedores } from "@/lib/modulos/proveedores/administracion-aplicacion"
import type { ResultadoProveedorAdmin } from "@/lib/modulos/proveedores/administracion-contrato"

// Server Actions de Proveedores. Cada una vuelve a exigir la Administradora en el servidor (via
// la administracion) y nunca devuelve detalles tecnicos al cliente.

async function ejecutar(
  nombre: string,
  accion: (encabezados: Headers) => Promise<ResultadoProveedorAdmin>,
): Promise<ResultadoProveedorAdmin> {
  try {
    const resultado = await accion(await headers())
    if (resultado.estado === "ok") revalidatePath("/admin/proveedores")
    return resultado
  } catch (error) {
    console.error(`[proveedores] fallo al ${nombre}`, { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function crearProveedorAccion(entrada: unknown) {
  return ejecutar("crear", (h) => obtenerAdministracionProveedores().crear(h, entrada))
}

export async function modificarProveedorAccion(referencia: unknown, entrada: unknown) {
  return ejecutar("modificar", (h) => obtenerAdministracionProveedores().modificar(h, referencia, entrada))
}

export async function cambiarActividadProveedorAccion(referencia: unknown, activo: boolean) {
  return ejecutar("cambiar la actividad", (h) => obtenerAdministracionProveedores().cambiarActividad(h, referencia, activo))
}
